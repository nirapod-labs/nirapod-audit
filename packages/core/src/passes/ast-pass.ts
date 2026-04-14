/**
 * @file ast-pass.ts
 * @brief Pass 2: Doxygen documentation structure checks using the tree-sitter CST.
 *
 * @remarks
 * Validates file-level Doxygen blocks (`@file`, `@brief`, `@details`, `@author`,
 * `@date`), class/struct/enum documentation, function parameter and return-value
 * coverage, `@ingroup`/`@defgroup` consistency, and `enum class` enforcement.
 *
 * The pass walks the CST looking for declaration nodes and then checks whether a
 * valid Doxygen comment block exists immediately before each declaration. Comment
 * blocks are parsed for specific Doxygen tags using regex patterns.
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
  NRP_DOX_001, NRP_DOX_002, NRP_DOX_003, NRP_DOX_004, NRP_DOX_005,
  NRP_DOX_006, NRP_DOX_007, NRP_DOX_008, NRP_DOX_009, NRP_DOX_010,
  NRP_DOX_011, NRP_DOX_012, NRP_DOX_013, NRP_DOX_014, NRP_DOX_015,
  NRP_DOX_017, NRP_DOX_018, NRP_DOX_019, NRP_DOX_020, NRP_DOX_021,
} from "../rules/doxygen/rules.js";

/**
 * Known-generic @brief phrases that should trigger NRP-DOX-003.
 *
 * @remarks
 * Single words and two-word phrases like "AES driver" or "Main file"
 * are too vague. The brief must describe what the file or symbol does.
 */
const GENERIC_BRIEFS: readonly string[] = [
  "driver", "module", "header", "source", "file", "main",
  "implementation", "utility", "helper", "wrapper", "interface",
  "manager", "handler", "controller", "service", "provider",
];

/**
 * Extracts the Doxygen comment block text preceding a given CST node.
 *
 * @param node - The declaration node to find comments before.
 * @param lines - File content split by line.
 * @returns The full text of the preceding `/** ... *‍/` block, or `null` if none.
 *
 * @remarks
 * Walks backwards from the line before `node.startPosition.row` looking for
 * a line containing `*‍/` and then scans upward to find `/**`. Returns the
 * joined text between those boundaries. Handles blank lines between the
 * comment block and the declaration (up to 2 blank lines).
 */
function getDocCommentBefore(
  node: Parser.SyntaxNode,
  lines: readonly string[],
): string | null {
  const declLine = node.startPosition.row;
  let endIdx = -1;

  // Walk backwards from the line before the declaration, skip blank lines
  for (let i = declLine - 1; i >= Math.max(0, declLine - 4); i--) {
    const trimmed = lines[i]?.trim() ?? "";
    if (trimmed === "") continue;
    if (trimmed.endsWith("*/")) {
      endIdx = i;
      break;
    }
    break; // Non-blank, non-comment-end line — no doc block here
  }

  if (endIdx < 0) return null;

  // Walk backwards from endIdx to find /**
  let startIdx = endIdx;
  for (let i = endIdx; i >= 0; i--) {
    const line = lines[i] ?? "";
    if (line.includes("/**")) {
      startIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx + 1).join("\n");
}

/**
 * Extracts the first Doxygen `/** ... *‍/` block in the file.
 *
 * @param lines - All source lines.
 * @returns The block text, or `null` if no Doxygen block exists.
 */
function getFirstDocBlock(lines: readonly string[]): {
  text: string;
  startLine: number;
  endLine: number;
} | null {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.includes("/**")) {
      start = i;
      break;
    }
    // If we hit a non-comment, non-blank line before finding /**, there's no header
    const trimmed = line.trim();
    if (trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("#")) {
      return null;
    }
  }
  if (start < 0) return null;

  for (let i = start; i < lines.length; i++) {
    if (lines[i]?.includes("*/")) {
      return { text: lines.slice(start, i + 1).join("\n"), startLine: start, endLine: i };
    }
  }
  return null;
}

/**
 * Checks if a Doxygen block contains a specific tag.
 *
 * @param block - The Doxygen comment text.
 * @param tag - The tag name without `@`, e.g. `"brief"`, `"param"`.
 * @returns `true` if the block contains `@tag`.
 */
function hasTag(block: string, tag: string): boolean {
  return new RegExp(`@${tag}\\b`).test(block);
}

/**
 * Extracts the text after a tag on the same line.
 *
 * @param block - The Doxygen comment text.
 * @param tag - The tag name without `@`.
 * @returns The text after the tag, trimmed. Empty string if tag not found.
 */
function tagContent(block: string, tag: string): string {
  const match = block.match(new RegExp(`@${tag}\\s+(.+)`));
  return match?.[1]?.trim() ?? "";
}

/**
 * Extracts all @param names from a Doxygen block.
 *
 * @param block - The Doxygen comment text.
 * @returns Array of parameter names found in @param tags.
 */
function extractDocParamNames(block: string): string[] {
  const regex = /@param(?:\[(?:in|out|in,out|inout)\])?\s+(\w+)/g;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(block)) !== null) {
    if (m[1]) names.push(m[1]);
  }
  return names;
}

/**
 * Extracts parameter names from a function declaration CST node.
 *
 * @param node - A function_declarator or function_definition node.
 * @returns Array of parameter names from the source.
 */
function extractSourceParamNames(node: Parser.SyntaxNode): string[] {
  const params: string[] = [];
  const paramList =
    node.descendantsOfType("parameter_declaration") ??
    [];
  for (const param of paramList) {
    const declarator = param.childForFieldName("declarator");
    if (declarator) {
      // Handle pointer_declarator: `const uint8_t* buf` → name is in the inner declarator
      const innerName =
        declarator.type === "pointer_declarator"
          ? declarator.descendantsOfType("identifier")[0]
          : declarator.type === "identifier"
            ? declarator
            : declarator.descendantsOfType("identifier")[0];
      if (innerName) {
        params.push(innerName.text);
      }
    }
  }
  return params;
}

/**
 * Checks if a function return type is void.
 *
 * @param node - A function_definition or declaration node.
 * @returns `true` if the function returns void.
 */
function isVoidReturn(node: Parser.SyntaxNode): boolean {
  const typeNode = node.childForFieldName("type");
  if (!typeNode) return false;
  return typeNode.text.trim() === "void";
}

/**
 * Collects all @ingroup names referenced in the file.
 *
 * @param raw - Raw file content.
 * @returns Array of group names referenced via @ingroup.
 */
function collectIngroups(raw: string): string[] {
  const regex = /@ingroup\s+(\w+)/g;
  const groups: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    if (m[1]) groups.push(m[1]);
  }
  return groups;
}

/**
 * Collects all @defgroup names declared in the file.
 *
 * @param raw - Raw file content.
 * @returns Array of group names declared via @defgroup.
 */
function collectDefgroups(raw: string): string[] {
  const regex = /@defgroup\s+(\w+)/g;
  const groups: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    if (m[1]) groups.push(m[1]);
  }
  return groups;
}

/**
 * Pass 2: Doxygen AST-level documentation structure checks.
 *
 * @remarks
 * Runs NRP-DOX-001 through NRP-DOX-022 by combining tree-sitter CST
 * traversal with Doxygen tag parsing. Only applies full strictness to
 * `public-header` and `module-doc` file roles; `impl` files get relaxed
 * treatment for some rules.
 */
export class AstPass implements Pass {
  readonly name = "AstPass";
  readonly languages = ["c", "cpp"] as const;

  /**
   * Run all Doxygen structure checks on one source file.
   *
   * @param ctx - File context with parsed CST and metadata.
   * @returns Diagnostics for all NRP-DOX rule violations found.
   */
  run(ctx: FileContext): Diagnostic[] {
    if (ctx.role === "third-party" || ctx.role === "asm" || ctx.role === "cmake" || ctx.role === "config") {
      return [];
    }

    const results: Diagnostic[] = [];
    const { lines, raw, path: filePath, rootNode, role } = ctx;
    const isHeader = role === "public-header" || role === "module-doc";

    // --- File-level checks ---
    this.checkFileHeader(lines, filePath, results);

    // --- module-doc.h must have @defgroup ---
    if (role === "module-doc") {
      this.checkDefgroup(raw, lines, filePath, results);
    }

    // --- Populate project-wide defgroups (pre-scan phase) ---
    for (const group of collectDefgroups(raw)) {
      ctx.project.definedGroups.add(group);
    }

    // --- Header-specific checks: classes, structs, enums, functions ---
    if (isHeader) {
      this.checkClasses(rootNode, lines, filePath, results, ctx.isCpp);
      this.checkStructs(rootNode, lines, filePath, results);
      this.checkEnums(rootNode, lines, filePath, results, ctx.isCpp);
      this.checkFunctions(rootNode, lines, filePath, results);
      this.checkIngroups(raw, lines, filePath, ctx, results);
    }

    return results;
  }

  /**
   * NRP-DOX-001 through NRP-DOX-005: file header checks.
   */
  private checkFileHeader(
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const block = getFirstDocBlock(lines);

    if (!block || !hasTag(block.text, "file")) {
      out.push(buildDiagnostic(NRP_DOX_001, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: "No @file Doxygen block found.",
        help: 'Add a /** @file filename.h\\n * @brief ... */ block at the top of the file.',
      }));
      return;
    }

    const text = block.text;

    if (!hasTag(text, "brief")) {
      out.push(buildDiagnostic(NRP_DOX_002, {
        span: lineSpan(filePath, block.startLine + 1, lines as string[]),
        message: "@file block has no @brief.",
        help: "Add a @brief line after @file with a one-sentence description of what this file does.",
      }));
    } else {
      const briefText = tagContent(text, "brief").toLowerCase();
      const words = briefText.split(/\s+/).filter(Boolean);
      if (
        words.length <= 2 &&
        words.some((w) => GENERIC_BRIEFS.includes(w))
      ) {
        out.push(buildDiagnostic(NRP_DOX_003, {
          span: lineSpan(filePath, block.startLine + 1, lines as string[]),
          message: `@brief is too generic: "${tagContent(text, "brief")}".`,
          help: "The brief must say what the file does, not what it is. Example: 'Hardware-accelerated AES-256-GCM driver for CC310/CC312 targets.'",
        }));
      }
    }

    if (!hasTag(text, "details")) {
      out.push(buildDiagnostic(NRP_DOX_004, {
        span: lineSpan(filePath, block.startLine + 1, lines as string[]),
        message: "@file block has no @details.",
        help: "Add a @details section explaining architecture, protocols, and design constraints.",
      }));
    }

    const missingMeta: string[] = [];
    if (!hasTag(text, "author")) missingMeta.push("@author");
    if (!hasTag(text, "date")) missingMeta.push("@date");
    if (!hasTag(text, "version")) missingMeta.push("@version");
    if (missingMeta.length > 0) {
      out.push(buildDiagnostic(NRP_DOX_005, {
        span: lineSpan(filePath, block.startLine + 1, lines as string[]),
        message: `@file block missing: ${missingMeta.join(", ")}.`,
        help: `Add ${missingMeta.join(", ")} to the file header block.`,
      }));
    }
  }

  /**
   * NRP-DOX-021: module-doc.h must have @defgroup.
   */
  private checkDefgroup(
    raw: string,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    if (!raw.includes("@defgroup")) {
      out.push(buildDiagnostic(NRP_DOX_021, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: "module-doc.h file has no @defgroup.",
        help: 'Add a @defgroup block: /** @defgroup GroupName Group Title\\n * @{ */.',
      }));
    }
  }

  /**
   * NRP-DOX-006, NRP-DOX-007: class documentation.
   */
  private checkClasses(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
    _isCpp: boolean,
  ): void {
    const classNodes = root.descendantsOfType("class_specifier");
    for (const cls of classNodes) {
      const nameNode = cls.childForFieldName("name");
      if (!nameNode) continue;

      const doc = getDocCommentBefore(cls, lines);
      if (!doc) {
        out.push(buildDiagnostic(NRP_DOX_006, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Class '${nameNode.text}' has no Doxygen block.`,
          help: `Add a /** @class ${nameNode.text}\\n * @brief ... */ block before the class declaration.`,
        }));
        continue;
      }

      const missing: string[] = [];
      if (!hasTag(doc, "details")) missing.push("@details");
      if (!hasTag(doc, "see")) missing.push("@see");
      if (missing.length > 0) {
        out.push(buildDiagnostic(NRP_DOX_007, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Class '${nameNode.text}' doc is incomplete: missing ${missing.join(", ")}.`,
          help: `Add ${missing.join(", ")} to the @class block.`,
        }));
      }
    }
  }

  /**
   * NRP-DOX-008, NRP-DOX-009: struct documentation and field docs.
   */
  private checkStructs(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const structNodes = root.descendantsOfType("struct_specifier");
    for (const st of structNodes) {
      const nameNode = st.childForFieldName("name");
      if (!nameNode) continue;

      const doc = getDocCommentBefore(st, lines);
      if (!doc) {
        out.push(buildDiagnostic(NRP_DOX_008, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Struct '${nameNode.text}' has no Doxygen block.`,
          help: `Add a /** @struct ${nameNode.text}\\n * @brief ... */ block before the struct.`,
        }));
      }

      // Check each field for ///< inline doc
      const body = st.childForFieldName("body");
      if (body) {
        const fields = body.descendantsOfType("field_declaration");
        for (const field of fields) {
          const fieldLine = field.endPosition.row;
          const lineAfterField = lines[fieldLine] ?? "";
          // Check if the same line or next line has ///<
          const hasInlineDoc =
            lineAfterField.includes("///<") ||
            (lines[fieldLine + 1]?.trim().startsWith("///<") ?? false);

          if (!hasInlineDoc) {
            const declarator = field.descendantsOfType("field_identifier")[0];
            const fieldName = declarator?.text ?? "unnamed";
            out.push(buildDiagnostic(NRP_DOX_009, {
              span: nodeToSpan(field, filePath, lines as string[]),
              message: `Struct field '${fieldName}' has no ///< inline documentation.`,
              help: `Add a ///< comment after the field declaration with units, valid ranges, and byte-order.`,
            }));
          }
        }
      }
    }
  }

  /**
   * NRP-DOX-010, NRP-DOX-011: enum documentation and enum class enforcement.
   */
  private checkEnums(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
    isCpp: boolean,
  ): void {
    const enumNodes = root.descendantsOfType("enum_specifier");
    for (const en of enumNodes) {
      const nameNode = en.childForFieldName("name");
      if (!nameNode) continue;

      const doc = getDocCommentBefore(en, lines);
      if (!doc) {
        out.push(buildDiagnostic(NRP_DOX_010, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Enum '${nameNode.text}' has no Doxygen block.`,
          help: `Add a /** @enum ${nameNode.text}\\n * @brief ... */ block before the enum.`,
        }));
      }

      // NRP-DOX-011: must be enum class (C++ only)
      if (isCpp) {
        const enumLine = lines[en.startPosition.row] ?? "";
        if (!enumLine.includes("enum class") && !enumLine.includes("enum struct")) {
          out.push(buildDiagnostic(NRP_DOX_011, {
            span: nodeToSpan(en, filePath, lines as string[]),
            message: `Enum '${nameNode.text}' is a plain enum, not enum class.`,
            help: `Change to 'enum class ${nameNode.text}'. Plain enums pollute the enclosing scope.`,
          }));
        }
      }
    }
  }

  /**
   * NRP-DOX-012 through NRP-DOX-018: function documentation checks.
   */
  private checkFunctions(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    // Check function declarations (in headers — no body)
    const declarations = root.descendantsOfType("declaration");
    for (const decl of declarations) {
      const funcDecl = decl.descendantsOfType("function_declarator")[0];
      if (!funcDecl) continue;

      const nameNode =
        funcDecl.childForFieldName("declarator");
      if (!nameNode) continue;
      const fnName = nameNode.text;

      const doc = getDocCommentBefore(decl, lines);
      if (!doc) {
        out.push(buildDiagnostic(NRP_DOX_012, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Function '${fnName}' has no Doxygen block.`,
          help: `Add a /** @brief ...\\n * @param ...\\n * @return ... */ block.`,
        }));
        continue;
      }

      // NRP-DOX-013: missing @brief
      if (!hasTag(doc, "brief")) {
        out.push(buildDiagnostic(NRP_DOX_013, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Function '${fnName}' doc block has no @brief.`,
          help: "Add @brief with a one-sentence description of what this function does.",
        }));
      }

      // NRP-DOX-014: missing @param for declared parameters
      const sourceParams = extractSourceParamNames(decl);
      const docParams = extractDocParamNames(doc);
      const missingParams = sourceParams.filter((p) => !docParams.includes(p));
      if (missingParams.length > 0) {
        out.push(buildDiagnostic(NRP_DOX_014, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Function '${fnName}' missing @param for: ${missingParams.join(", ")}.`,
          help: `Add @param[in] ${missingParams[0]} - description. Repeat for each missing parameter.`,
        }));
      }

      // NRP-DOX-015: missing @return on non-void function
      if (!isVoidReturn(decl) && !hasTag(doc, "return") && !hasTag(doc, "retval")) {
        out.push(buildDiagnostic(NRP_DOX_015, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Function '${fnName}' returns non-void but has no @return.`,
          help: "Add @return documenting the return value and all error codes.",
        }));
      }

      // NRP-DOX-017: missing @pre or @post
      if (!hasTag(doc, "pre") && !hasTag(doc, "post")) {
        out.push(buildDiagnostic(NRP_DOX_017, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Function '${fnName}' missing @pre/@post contract documentation.`,
          help: "Add @pre and @post to document the function's preconditions and postconditions.",
        }));
      }

      // NRP-DOX-018: missing @see
      if (!hasTag(doc, "see")) {
        out.push(buildDiagnostic(NRP_DOX_018, {
          span: nodeToSpan(nameNode, filePath, lines as string[]),
          message: `Function '${fnName}' has no @see cross-reference.`,
          help: "Add @see with references to related functions, types, or external docs.",
        }));
      }
    }
  }

  /**
   * NRP-DOX-019, NRP-DOX-020: @ingroup checks.
   */
  private checkIngroups(
    raw: string,
    lines: readonly string[],
    filePath: string,
    ctx: FileContext,
    out: Diagnostic[],
  ): void {
    const ingroups = collectIngroups(raw);

    // NRP-DOX-019: header has no @ingroup at all
    if (ingroups.length === 0) {
      out.push(buildDiagnostic(NRP_DOX_019, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: "Header file has no @ingroup tag.",
        help: "Add @ingroup GroupName to the file header or to individual class/function blocks.",
      }));
    }

    // NRP-DOX-020: @ingroup references undefined group
    for (const group of ingroups) {
      if (
        ctx.project.definedGroups.size > 0 &&
        !ctx.project.definedGroups.has(group)
      ) {
        const lineIdx = lines.findIndex((l) => l.includes(`@ingroup ${group}`));
        out.push(buildDiagnostic(NRP_DOX_020, {
          span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
          message: `@ingroup '${group}' references an undefined group.`,
          help: `Define this group in a module-doc.h file: /** @defgroup ${group} GroupTitle */`,
          notes: [
            "Cross-file check: the group must be defined via @defgroup somewhere in the project.",
            `Known groups: ${[...ctx.project.definedGroups].join(", ") || "(none yet)"}`,
          ],
        }));
      }
    }
  }
}
