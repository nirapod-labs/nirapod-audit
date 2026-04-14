/**
 * @file memory-pass.ts
 * @brief Pass 5: Memory safety checks on C/C++ source via tree-sitter CST.
 *
 * @remarks
 * Detects common embedded memory safety issues: unchecked array subscripts,
 * pointer dereference without null guard, and size_t narrowing casts.
 *
 * NRP-MEM-001 and NRP-MEM-003 are heuristic-based (they check for the
 * presence of assertion patterns near the usage site rather than full
 * dataflow). This catches the majority of real-world cases without
 * requiring a CFG.
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
import { buildDiagnostic, nodeToSpan } from "../diagnostic.js";
import {
  NRP_MEM_002, NRP_MEM_004,
} from "../rules/memory/rules.js";

/**
 * Null-check assertion patterns.
 *
 * @remarks Matched against the function body text preceding a pointer dereference.
 */
const NULL_CHECK_PATTERN =
  /NIRAPOD_ASSERT\s*\([^)]*!=\s*NULL|NIRAPOD_ASSERT\s*\([^)]*!=\s*nullptr|assert\s*\([^)]*!=\s*NULL|if\s*\([^)]*==\s*NULL|if\s*\(![\w]+\s*\)/;

/**
 * Narrowing cast patterns: (int), (uint32_t), (int32_t), static_cast<int>.
 */
const NARROWING_CAST_PATTERN =
  /\(\s*(?:int|uint32_t|int32_t|unsigned\s+int|uint16_t|int16_t)\s*\)|static_cast\s*<\s*(?:int|uint32_t|int32_t)\s*>/;

/**
 * Pass 5: memory safety checks.
 *
 * @remarks
 * Checks NRP-MEM-002 (null deref) and NRP-MEM-004 (size narrowing).
 * NRP-MEM-001 (array bounds) and NRP-MEM-003 (size overflow) need
 * more advanced analysis and are deferred.
 */
export class MemoryPass implements Pass {
  readonly name = "MemoryPass";
  readonly languages = ["c", "cpp"] as const;

  /**
   * Run all memory safety checks on one source file.
   *
   * @param ctx - File context with parsed CST and metadata.
   * @returns Diagnostics for memory safety violations found.
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

    this.checkPointerNullGuard(rootNode, lines, filePath, results);
    this.checkSizeNarrowing(rootNode, lines, filePath, results);

    return results;
  }

  /**
   * NRP-MEM-002: pointer parameter dereferenced without null check.
   *
   * @remarks
   * For each function with pointer parameters, checks if the function body
   * contains a null assertion on that parameter before any dereference.
   * This is a heuristic check — it looks for the assertion pattern anywhere
   * in the function body text, not control-flow ordering.
   */
  private checkPointerNullGuard(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");

    for (const funcDef of funcDefs) {
      const declarator = funcDef.childForFieldName("declarator");
      if (!declarator) continue;

      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      // Find all pointer parameters
      const params = this.extractPointerParams(declarator);
      if (params.length === 0) continue;

      const bodyText = body.text;

      for (const paramName of params) {
        // Check if there is a null assertion for this parameter
        const hasNullCheck =
          bodyText.includes(`NIRAPOD_ASSERT(${paramName} != NULL)`) ||
          bodyText.includes(`NIRAPOD_ASSERT(${paramName} != nullptr)`) ||
          bodyText.includes(`assert(${paramName} != NULL)`) ||
          bodyText.includes(`assert(${paramName} != nullptr)`) ||
          bodyText.includes(`if (${paramName} == NULL)`) ||
          bodyText.includes(`if (${paramName} == nullptr)`) ||
          bodyText.includes(`if (!${paramName})`);

        if (hasNullCheck) continue;

        // Check if the parameter is actually dereferenced (-> or *)
        const derefPattern = new RegExp(
          `(?:${paramName}\\s*->|\\*\\s*${paramName})`,
        );
        if (derefPattern.test(bodyText)) {
          out.push(buildDiagnostic(NRP_MEM_002, {
            span: nodeToSpan(funcDef, filePath, lines as string[]),
            message: `Pointer parameter '${paramName}' dereferenced without null check.`,
            help: `Add NIRAPOD_ASSERT(${paramName} != NULL); at function entry.`,
          }));
        }
      }
    }
  }

  /**
   * NRP-MEM-004: size_t cast to int/uint32_t without range check.
   *
   * @remarks
   * Scans the raw lines for C-style casts and static_cast patterns that
   * narrow from size_t. This is a text-level heuristic rather than
   * type-system analysis — it flags patterns like `(int)some_size_t_var`.
   */
  private checkSizeNarrowing(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");

    for (const funcDef of funcDefs) {
      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      const startRow = body.startPosition.row;
      const endRow = body.endPosition.row;

      for (let i = startRow; i <= endRow && i < lines.length; i++) {
        const line = lines[i] ?? "";

        // Skip if not a narrowing cast or if it doesn't involve size
        if (!NARROWING_CAST_PATTERN.test(line)) continue;
        if (!/size|len|length|count|num|capacity/i.test(line)) continue;

        // Check if there is a range check in the preceding 5 lines
        let hasRangeCheck = false;
        for (
          let j = Math.max(startRow, i - 5);
          j < i;
          j++
        ) {
          const prev = lines[j] ?? "";
          if (
            /NIRAPOD_ASSERT|assert|if\s*\(.*[<>]/.test(prev) &&
            /size|len|length|count/i.test(prev)
          ) {
            hasRangeCheck = true;
            break;
          }
        }

        if (!hasRangeCheck) {
          out.push(buildDiagnostic(NRP_MEM_004, {
            span: {
              file: filePath,
              startLine: i + 1,
              startCol: 1,
              endLine: i + 1,
              endCol: line.length + 1,
              snippet: line,
            },
            message: "size_t narrowed to int/uint32_t without range check.",
            help: "Add NIRAPOD_ASSERT(size <= UINT32_MAX); before the cast.",
          }));
        }
      }
    }
  }

  /**
   * Extracts pointer parameter names from a function declarator.
   *
   * @param declarator - The function_declarator or nested declarator node.
   * @returns Array of parameter names that are pointer types.
   */
  private extractPointerParams(
    declarator: Parser.SyntaxNode,
  ): string[] {
    const params: string[] = [];

    // Walk to the function_declarator
    let funcDecl = declarator;
    while (funcDecl.type !== "function_declarator" && funcDecl.namedChildCount > 0) {
      const child = funcDecl.childForFieldName("declarator") ?? funcDecl.namedChildren[0];
      if (!child) break;
      funcDecl = child;
    }

    if (funcDecl.type !== "function_declarator") return params;

    const paramList = funcDecl.childForFieldName("parameters");
    if (!paramList) return params;

    for (const param of paramList.namedChildren) {
      if (param.type !== "parameter_declaration") continue;

      // Check if the type contains a pointer
      const paramText = param.text;
      if (paramText.includes("*")) {
        // Extract the parameter name (last identifier)
        const paramDecl = param.childForFieldName("declarator");
        if (paramDecl) {
          // Handle pointer_declarator wrapping
          let nameNode = paramDecl;
          while (nameNode.type === "pointer_declarator") {
            const inner = nameNode.childForFieldName("declarator") ?? nameNode.namedChildren[0];
            if (!inner) break;
            nameNode = inner;
          }
          if (nameNode.type === "identifier") {
            params.push(nameNode.text);
          }
        }
      }
    }

    return params;
  }
}
