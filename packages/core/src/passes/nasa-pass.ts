/**
 * @file nasa-pass.ts
 * @brief Pass 3: NASA JPL "Power of 10" safety checks using tree-sitter CST.
 *
 * @remarks
 * Implements NRP-NASA-001 through NRP-NASA-012. These rules enforce
 * deterministic control flow, bounded resource usage, and defensive
 * coding patterns required for safety-critical embedded firmware.
 *
 * The pass walks the CST looking for forbidden constructs (goto, recursion,
 * dynamic allocation) and measuring function complexity (line count,
 * assertion density). Only applies to C/C++ files.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type Parser from "tree-sitter";
import type { Diagnostic } from "@nirapod-audit/protocol";
import type { FileContext } from "../context.js";
import type { Pass } from "../pipeline/pass.js";
import { buildDiagnostic, lineSpan, nodeToSpan } from "../diagnostic.js";
import {
  NRP_NASA_001, NRP_NASA_002, NRP_NASA_003, NRP_NASA_004,
  NRP_NASA_005, NRP_NASA_006, NRP_NASA_007, NRP_NASA_008,
  NRP_NASA_009, NRP_NASA_010,
} from "../rules/nasa/rules.js";

/**
 * Dynamic allocation functions banned by NASA Rule 3.
 *
 * @remarks Includes C and C++ allocators. Also catches common wrappers.
 */
const ALLOC_FUNCTIONS = new Set([
  "malloc", "calloc", "realloc", "free",
  "new", "delete",
  "aligned_alloc", "posix_memalign",
  "strdup", "strndup",
]);

/**
 * Assertion macro names recognized by NASA Rule 5.
 *
 * @remarks Case-sensitive. Add project-specific assert macros here.
 */
const ASSERT_PATTERNS = new Set([
  "NIRAPOD_ASSERT",
  "NIRAPOD_STATIC_ASSERT",
  "assert",
  "static_assert",
  "NRF_ASSERT",
  "__ASSERT",
  "__ASSERT_NO_MSG",
]);

/**
 * Known allowed macros that are exempt from NRP-NASA-009/010.
 *
 * @remarks Platform guards, include guards, and project-level assert
 *   macros are legitimate preprocessor uses.
 */
const EXEMPT_MACROS = new Set([
  "NIRAPOD_ASSERT",
  "NIRAPOD_STATIC_ASSERT",
  "NRF_ASSERT",
  "__ASSERT",
  "__ASSERT_NO_MSG",
  "LOG_MODULE_REGISTER",
  "LOG_MODULE_DECLARE",
  "BUILD_ASSERT",
  "STATIC_ASSERT",
  "IS_ENABLED",
  "COND_CODE_1",
  "COND_CODE_0",
  "DT_CHOSEN",
  "DT_NODELABEL",
  "DT_PROP",
]);

/**
 * Banned functions: setjmp/longjmp (NASA Rule 1).
 */
const SETJMP_FUNCTIONS = new Set(["setjmp", "longjmp", "_setjmp", "_longjmp"]);

/**
 * Counts the non-blank, non-comment lines in a range.
 *
 * @param lines - All source lines of the file.
 * @param startRow - 0-based start row (inclusive).
 * @param endRow - 0-based end row (inclusive).
 * @returns Count of lines that contain actual code.
 */
function countCodeLines(
  lines: readonly string[],
  startRow: number,
  endRow: number,
): number {
  let count = 0;
  let inBlockComment = false;

  for (let i = startRow; i <= endRow && i < lines.length; i++) {
    const trimmed = (lines[i] ?? "").trim();

    // Track block comments
    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) {
        inBlockComment = true;
      }
      continue;
    }

    // Skip blank lines and single-line comments
    if (trimmed === "" || trimmed.startsWith("//")) {
      continue;
    }

    // Skip lines that are only braces
    if (trimmed === "{" || trimmed === "}") {
      continue;
    }

    count++;
  }

  return count;
}

/**
 * Extracts the function name from a function_definition CST node.
 *
 * @param node - A function_definition node.
 * @returns The function name string, or null if it can't be determined.
 */
function getFunctionName(node: Parser.SyntaxNode): string | null {
  const declarator = node.childForFieldName("declarator");
  if (!declarator) return null;

  // Walk through pointer_declarator, reference_declarator, etc.
  let current = declarator;
  while (
    current.type === "pointer_declarator" ||
    current.type === "reference_declarator"
  ) {
    const inner =
      current.childForFieldName("declarator") ??
      current.namedChildren[0];
    if (!inner) break;
    current = inner;
  }

  if (current.type === "function_declarator") {
    const nameNode = current.childForFieldName("declarator");
    if (nameNode) return nameNode.text;
  }

  // qualified_identifier for class methods: ClassName::methodName
  if (current.type === "qualified_identifier") {
    return current.text;
  }

  return current.type === "identifier" ? current.text : null;
}

/**
 * Checks if a line above a loop documents an upper bound.
 *
 * @param lines - File source lines.
 * @param loopRow - 0-based row of the loop statement.
 * @returns `true` if a comment near the loop mentions a bound.
 *
 * @remarks
 * Looks at the 3 lines above the loop for comments containing
 * bound-related keywords like "max", "bound", "limit", "iterations",
 * or explicit numbers.
 */
function hasLoopBoundComment(
  lines: readonly string[],
  loopRow: number,
): boolean {
  const boundPattern = /\b(?:max|bound|limit|iter[s]?|upper|cap|at\s*most|ceil)\b/i;
  const numberPattern = /\d+/;

  for (let i = Math.max(0, loopRow - 3); i < loopRow; i++) {
    const line = (lines[i] ?? "").trim();
    if (
      (line.startsWith("//") || line.startsWith("*")) &&
      (boundPattern.test(line) || numberPattern.test(line))
    ) {
      return true;
    }
  }

  // Also check inline comment on the same line
  const loopLine = (lines[loopRow] ?? "").trim();
  if (loopLine.includes("//") && boundPattern.test(loopLine)) {
    return true;
  }

  return false;
}

/**
 * Checks if a for-loop has a static bound (e.g., `i < ARRAY_SIZE`).
 *
 * @param node - A for_statement CST node.
 * @returns `true` if the loop condition uses a comparison with a constant or size.
 */
function hasStaticBound(node: Parser.SyntaxNode): boolean {
  const condition = node.childForFieldName("condition");
  if (!condition) return false;

  const condText = condition.text;
  // Matches: i < N, i < sizeof(...), i < ARRAY_SIZE, i <= 255, etc.
  return /[<>]=?\s*(?:\d+|sizeof|ARRAY_SIZE|[A-Z_]{2,})/.test(condText);
}

/**
 * Pass 3: NASA JPL "Power of 10" safety checks.
 *
 * @remarks
 * Runs NRP-NASA-001 through NRP-NASA-010 by traversing the tree-sitter CST.
 * Skips third-party, assembly, cmake, and config files.
 */
export class NasaPass implements Pass {
  readonly name = "NasaPass";
  readonly languages = ["c", "cpp"] as const;

  /**
   * Run all NASA safety checks on one source file.
   *
   * @param ctx - File context with parsed CST and metadata.
   * @returns Diagnostics for all NASA rule violations found.
   */
  run(ctx: FileContext): Diagnostic[] {
    if (
      ctx.role === "third-party" ||
      ctx.role === "asm" ||
      ctx.role === "cmake" ||
      ctx.role === "config"
    ) {
      return [];
    }

    const results: Diagnostic[] = [];
    const { rootNode, lines, path: filePath } = ctx;

    this.checkGoto(rootNode, lines, filePath, results);
    this.checkSetjmpLongjmp(rootNode, lines, filePath, results);
    this.checkRecursion(rootNode, lines, filePath, results);
    this.checkLoopBounds(rootNode, lines, filePath, results);
    this.checkDynamicAlloc(rootNode, lines, filePath, results);
    this.checkFunctionLength(rootNode, lines, filePath, ctx, results);
    this.checkAssertions(rootNode, lines, filePath, results);
    this.checkMacros(rootNode, lines, filePath, results);

    return results;
  }

  /**
   * NRP-NASA-001: no goto statements.
   */
  private checkGoto(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const gotos = root.descendantsOfType("goto_statement");
    for (const node of gotos) {
      out.push(buildDiagnostic(NRP_NASA_001, {
        span: nodeToSpan(node, filePath, lines as string[]),
        message: "goto statement found.",
        help: "Rewrite using a loop, early return, or a state variable. goto makes control flow unverifiable.",
      }));
    }
  }

  /**
   * NRP-NASA-002: no setjmp/longjmp.
   */
  private checkSetjmpLongjmp(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const calls = root.descendantsOfType("call_expression");
    for (const call of calls) {
      const fn = call.childForFieldName("function");
      if (fn && SETJMP_FUNCTIONS.has(fn.text)) {
        out.push(buildDiagnostic(NRP_NASA_002, {
          span: nodeToSpan(call, filePath, lines as string[]),
          message: `${fn.text}() call found.`,
          help: "Use structured error handling (return codes, error structs) instead of non-local jumps.",
        }));
      }
    }
  }

  /**
   * NRP-NASA-003: no direct recursion (same translation unit).
   */
  private checkRecursion(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");
    for (const funcDef of funcDefs) {
      const fnName = getFunctionName(funcDef);
      if (!fnName) continue;

      // Find all call_expressions inside this function body
      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      const calls = body.descendantsOfType("call_expression");
      for (const call of calls) {
        const callee = call.childForFieldName("function");
        if (callee && callee.text === fnName) {
          out.push(buildDiagnostic(NRP_NASA_003, {
            span: nodeToSpan(call, filePath, lines as string[]),
            message: `Function '${fnName}' calls itself directly.`,
            help: `Replace recursion with an iterative algorithm using an explicit stack or loop with a bounded iteration count.`,
          }));
        }
      }
    }
  }

  /**
   * NRP-NASA-004: all loops must have documented upper bounds.
   */
  private checkLoopBounds(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const loopTypes = [
      ...root.descendantsOfType("for_statement"),
      ...root.descendantsOfType("while_statement"),
      ...root.descendantsOfType("do_statement"),
    ];

    for (const loop of loopTypes) {
      const row = loop.startPosition.row;

      // Skip if the loop has a static bound (for-loops with constant comparisons)
      if (loop.type === "for_statement" && hasStaticBound(loop)) {
        continue;
      }

      // Check for a bound comment above
      if (!hasLoopBoundComment(lines, row)) {
        out.push(buildDiagnostic(NRP_NASA_004, {
          span: nodeToSpan(loop, filePath, lines as string[]),
          message: `${loop.type.replace("_", " ")} with no documented upper bound.`,
          help: `Add a comment above the loop documenting the maximum iteration count, e.g.: // max: 256 iterations (buffer size)`,
        }));
      }
    }
  }

  /**
   * NRP-NASA-005: no dynamic allocation after init.
   */
  private checkDynamicAlloc(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const calls = root.descendantsOfType("call_expression");
    for (const call of calls) {
      const fn = call.childForFieldName("function");
      if (fn && ALLOC_FUNCTIONS.has(fn.text)) {
        out.push(buildDiagnostic(NRP_NASA_005, {
          span: nodeToSpan(call, filePath, lines as string[]),
          message: `Dynamic allocation function '${fn.text}()' called.`,
          help: "Use statically allocated buffers or allocate only during system initialization.",
        }));
      }
    }

    // Also catch C++ new/delete expressions
    const newExprs = root.descendantsOfType("new_expression");
    for (const expr of newExprs) {
      out.push(buildDiagnostic(NRP_NASA_005, {
        span: nodeToSpan(expr, filePath, lines as string[]),
        message: "C++ 'new' expression found.",
        help: "Use statically allocated objects or placement new with pre-allocated memory.",
      }));
    }

    const deleteExprs = root.descendantsOfType("delete_expression");
    for (const expr of deleteExprs) {
      out.push(buildDiagnostic(NRP_NASA_005, {
        span: nodeToSpan(expr, filePath, lines as string[]),
        message: "C++ 'delete' expression found.",
        help: "If using placement new, call the destructor explicitly without delete.",
      }));
    }
  }

  /**
   * NRP-NASA-006: function body must not exceed 60 lines.
   * NRP-NASA-007: non-trivial functions must have at least 2 assertions.
   */
  private checkFunctionLength(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    ctx: FileContext,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");
    const maxLines = ctx.project.config.maxFunctionLines;

    for (const funcDef of funcDefs) {
      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      const fnName = getFunctionName(funcDef) ?? "anonymous";
      const startRow = body.startPosition.row;
      const endRow = body.endPosition.row;
      const codeLines = countCodeLines(lines, startRow, endRow);

      // NRP-NASA-006: function too long
      if (codeLines > maxLines) {
        out.push(buildDiagnostic(NRP_NASA_006, {
          span: nodeToSpan(funcDef, filePath, lines as string[]),
          message: `Function '${fnName}' is ${codeLines} lines; limit is ${maxLines}.`,
          help: `Split into smaller functions. Look for natural boundaries: setup, core logic, cleanup.`,
          notes: [
            `Counted ${codeLines} non-blank, non-comment lines from line ${startRow + 1} to ${endRow + 1}.`,
          ],
        }));
      }
    }
  }

  /**
   * NRP-NASA-007: non-trivial functions need at least 2 NIRAPOD_ASSERT calls.
   */
  private checkAssertions(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");

    for (const funcDef of funcDefs) {
      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      const fnName = getFunctionName(funcDef) ?? "anonymous";
      const startRow = body.startPosition.row;
      const endRow = body.endPosition.row;
      const codeLines = countCodeLines(lines, startRow, endRow);

      // Skip trivial functions (5 lines or fewer)
      if (codeLines <= 5) continue;

      // Count assertion calls
      const calls = body.descendantsOfType("call_expression");
      let assertCount = 0;
      for (const call of calls) {
        const fn = call.childForFieldName("function");
        if (fn && ASSERT_PATTERNS.has(fn.text)) {
          assertCount++;
        }
      }

      if (assertCount < 2) {
        out.push(buildDiagnostic(NRP_NASA_007, {
          span: nodeToSpan(funcDef, filePath, lines as string[]),
          message: `Function '${fnName}' has ${assertCount} assertion(s); minimum is 2.`,
          help: `Add NIRAPOD_ASSERT() calls to verify preconditions (parameter ranges, null checks) and invariants.`,
        }));
      }
    }
  }

  /**
   * NRP-NASA-009/010: restrict preprocessor use.
   */
  private checkMacros(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const macros = root.descendantsOfType("preproc_def");

    for (const macro of macros) {
      const nameNode = macro.childForFieldName("name");
      if (!nameNode) continue;
      const name = nameNode.text;

      // Skip exempt macros (platform guards, assert macros)
      if (EXEMPT_MACROS.has(name)) continue;

      // Skip include guards (_FOO_H_, FOO_H, etc.)
      if (
        name.endsWith("_H") ||
        name.endsWith("_H_") ||
        name.endsWith("_HPP") ||
        name.endsWith("_HPP_")
      ) {
        continue;
      }

      // Skip macros starting with underscore (compiler/platform builtins)
      if (name.startsWith("__")) continue;

      const value = macro.childForFieldName("value");
      if (!value) continue; // #define FOO (no value) — flag/toggle, skip
      const valueText = value.text.trim();

      // NRP-NASA-009: constant-like macro (all-caps, numeric/string value)
      if (/^[A-Z_][A-Z0-9_]*$/.test(name)) {
        // Check if value looks like a constant (number, string, char, expression of constants)
        if (/^(?:0[xXbB])?[\d]+[uUlLfF]*$/.test(valueText) || /^".*"$/.test(valueText) || /^'.*'$/.test(valueText)) {
          out.push(buildDiagnostic(NRP_NASA_009, {
            span: nodeToSpan(macro, filePath, lines as string[]),
            message: `#define ${name} used for constant value '${valueText}'.`,
            help: `Replace with: static constexpr auto ${name} = ${valueText};`,
          }));
        }
      }
    }

    // NRP-NASA-010: function-like macros
    const funcMacros = root.descendantsOfType("preproc_function_def");
    for (const macro of funcMacros) {
      const nameNode = macro.childForFieldName("name");
      if (!nameNode) continue;
      const name = nameNode.text;

      if (EXEMPT_MACROS.has(name)) continue;
      if (name.startsWith("__")) continue;

      out.push(buildDiagnostic(NRP_NASA_010, {
        span: nodeToSpan(macro, filePath, lines as string[]),
        message: `Function-like macro '${name}' found.`,
        help: `Replace with an inline function for type safety and debuggability.`,
      }));
    }
  }
}
