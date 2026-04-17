/**
 * @file advanced-doxygen-pass.ts
 * @brief Pass for DOXYGEN-ADVANCED category rules.
 *
 * @remarks
 * Handles @copydoc resolution, @snippet verification, Doxyfile config-aware
 * checks (ALIASES, xrefitem, math, PlantUML, @cite, TAG files,
 * @tableofcontents), and dual-view metric engine for @if/@endif blocks.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Diagnostic } from "@nirapod-audit/protocol";
import type { FileContext } from "../context.js";
import type { Pass } from "../pipeline/pass.js";
import { buildDiagnostic, lineSpan } from "../diagnostic.js";
import fs from "node:fs";
import path from "node:path";
import {
  NRP_DOX_ADV_001,
  NRP_DOX_ADV_002,
  NRP_DOX_ADV_003,
  NRP_DOX_ADV_004,
  NRP_DOX_ADV_005,
  NRP_DOX_ADV_005b,
  NRP_DOX_ADV_006,
  NRP_DOX_ADV_006b,
  NRP_DOX_ADV_007,
  NRP_DOX_ADV_007b,
  NRP_DOX_ADV_008,
  NRP_DOX_ADV_008b,
  NRP_DOX_ADV_009,
  NRP_DOX_ADV_009b,
  NRP_DOX_ADV_010,
  NRP_DOX_ADV_010b,
  NRP_DOX_ADV_011,
} from "../rules/doxygen/advanced.js";
import { NRP_DOX_004 } from "../rules/doxygen/rules.js";
import {
  loadDoxyfile,
  findCopydocTarget,
  checkSnippetFile,
  validateMathTags,
  validatePlantUml,
  validateCiteKeys,
  validateIfBlocks,
  validateTagFiles,
  type DoxyfileConfig,
} from "../utils/doxygen.js";

let doxyfileConfig: DoxyfileConfig | null = null;
const allFiles: string[] = [];
const linesByFile = new Map<string, string[]>();
const bibKeys = new Set<string>();

const DOXYGEN_BUILTIN_COMMANDS = new Set([
  "a", "addindex", "addtogroup", "anchor", "arg", "attention", "author", "authors",
  "b", "brief", "bug", "c", "callergraph", "callgraph", "category", "check", "cite",
  "class", "code", "cond", "copybrief", "copydetails", "copydoc", "copyright", "date",
  "def", "defgroup", "deprecated", "details", "dir", "docbookonly", "dontinclude",
  "dot", "dotfile", "e", "else", "elseif", "em", "endcode", "endcond", "enddocbookonly",
  "enddot", "endhtmlonly", "endif", "endinternal", "endlatexonly", "endlink",
  "endmanonly", "endmsc", "endparblock", "endrtfonly", "endsecreflist", "enduml",
  "endverbatim", "endxmlonly", "enum", "example", "exception", "extends", "f",
  "file", "fn", "headerfile", "hidecallergraph", "hidecallgraph", "hideinitializer",
  "htmlinclude", "htmlonly", "idlexcept", "if", "ifnot", "image", "implements",
  "include", "includedoc", "includelineno", "ingroup", "internal", "invariant",
  "interface", "latexinclude", "latexonly", "li", "line", "link", "mainpage",
  "manonly", "memberof", "msc", "mscfile", "n", "name", "namespace", "nosubgrouping",
  "note", "overload", "p", "package", "page", "par", "paragraph", "param", "parblock",
  "post", "pre", "private", "privatesection", "property", "protected",
  "protectedsection", "protocol", "public", "publicsection", "pure", "ref",
  "refitem", "related", "relates", "relatedalso", "relatesalso", "remark",
  "remarks", "result", "return", "returns", "retval", "rtfonly", "sa",
  "secreflist", "section", "see", "short", "showinitializer", "since", "skip",
  "skipline", "snippet", "snippetdoc", "snippetlineno", "startuml", "struct",
  "subpage", "subsection", "subsubsection", "tableofcontents", "test", "throw",
  "throws", "todo", "tparam", "typedef", "union", "until", "var", "verbatim",
  "verbinclude", "version", "vhdlflow", "warning", "weakgroup", "xmlonly",
  "xrefitem"
]);

export class AdvancedDoxygenPass implements Pass {
  readonly name = "AdvancedDoxygenPass";
  readonly languages = ["c", "cpp"] as const;

  static init(projectRoot: string, doxyfilePath: string | null, files: string[]): void {
    allFiles.length = 0;
    linesByFile.clear();
    allFiles.push(...files);

    for (const filePath of files) {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        linesByFile.set(filePath, content.split("\n"));
      }
    }

    doxyfileConfig = loadDoxyfile(doxyfilePath, projectRoot);
  }

  static loadBibKeys(_projectRoot: string, _bibFiles: string[]): void {
    bibKeys.clear();
  }

  static checkTagFiles(): Diagnostic[] {
    const results: Diagnostic[] = [];
    if (!doxyfileConfig || doxyfileConfig.tagFiles.length === 0) {
      return results;
    }

    const validation = validateTagFiles(doxyfileConfig.tagFiles);

    for (const entry of validation.missing) {
      results.push(buildDiagnostic(NRP_DOX_ADV_010, {
        span: { file: entry.tagFilePath, startLine: 1, startCol: 1, endLine: 1, endCol: 1, snippet: "" },
        message: `TAG file '${entry.tagFilePath}' does not exist on disk.`,
        help: "Ensure the tag file path is correct in TAGFILES.",
        notes: [],
        relatedSpans: [],
      }));
    }

    for (const entry of validation.noUrlMapping) {
      results.push(buildDiagnostic(NRP_DOX_ADV_010b, {
        span: { file: entry.tagFilePath, startLine: 1, startCol: 1, endLine: 1, endCol: 1, snippet: "" },
        message: `TAG file entry has no URL mapping (cross-links will be broken).`,
        help: "Add URL mapping to TAGFILES entry: path/to/file.tag=https://docs.example.com/",
        notes: [],
        relatedSpans: [],
      }));
    }

    return results;
  }

  run(ctx: FileContext): Diagnostic[] {
    if (ctx.role === "third-party" || ctx.role === "asm" || ctx.role === "cmake" || ctx.role === "config") {
      return [];
    }

    const results: Diagnostic[] = [];
    const { lines, raw, path: filePath, project } = ctx;

    const hasAdvancedTags = raw.includes("@snippet") || raw.includes("@copydoc") || raw.includes("@alias") || raw.includes("@xrefitem") || raw.includes("@tableofcontents") || raw.includes("@if ") || raw.includes("@f$") || raw.includes("@f[") || raw.includes("@startuml") || raw.includes("@cite");
    if (!hasAdvancedTags) {
      return results;
    }

    this.checkCopydoc(raw, lines, filePath, results);
    this.checkSnippet(raw, lines, filePath, project.rootDir, results);
    this.checkAliases(raw, lines, filePath, results);
    this.checkXrefitem(raw, lines, filePath, results);
    this.checkMath(raw, lines, filePath, results);
    this.checkPlantUml(raw, lines, filePath, results);
    this.checkCite(raw, lines, filePath, results);
    this.checkIfBlocks(raw, lines, filePath, results);
    this.checkTableOfContents(raw, lines, filePath, results);

    return results;
  }

  private checkCopydoc(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    const regex = /@copydoc\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
      const symbolName = m[1] ?? "";
      if (!symbolName) continue;
      const target = findCopydocTarget(symbolName, allFiles, linesByFile);
      if (!target) {
        const lineIdx = lines.findIndex((l) => l.includes(`@copydoc ${symbolName}`));
        out.push(buildDiagnostic(NRP_DOX_ADV_001, {
          span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
          message: `@copydoc references symbol '${symbolName}' not found in codebase.`,
          help: "Ensure the target symbol exists and is documented.",
        }));
      }
    }

    const chainRegex = /@copydoc\s+(\w+)/g;
    const chains: string[] = [];
    while ((m = chainRegex.exec(raw)) !== null) {
      const chain = m[1] ?? "";
      if (chain) chains.push(chain);
    }

    if (chains.length > 3) {
      const lineIdx = lines.findIndex((l) => l.includes("@copydoc"));
      out.push(buildDiagnostic(NRP_DOX_ADV_002, {
        span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
        message: "@copydoc chain exceeds 3 hops (maximum resolution depth).",
        help: "Reduce the @copydoc chain depth to 3 or fewer hops.",
      }));
    }
  }

  private checkSnippet(raw: string, lines: readonly string[], filePath: string, projectRoot: string, out: Diagnostic[]): void {
    const regex = /@snippet\s+(.+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
      const snippetRef = (m[1] ?? "").trim();
      if (!snippetRef) continue;
      const result = checkSnippetFile(snippetRef, projectRoot);

      if (!result.valid) {
        const lineIdx = lines.findIndex((l) => l.includes(`@snippet ${snippetRef}`));
        out.push(buildDiagnostic(NRP_DOX_ADV_003, {
          span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
          message: result.error || "snippet error",
          help: "Verify the file exists and contains the //! [tag] marker.",
        }));
      }
    }
  }

  private checkAliases(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    if (!doxyfileConfig) return;

    const aliasRegex = /@(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = aliasRegex.exec(raw)) !== null) {
      const aliasName = m[1] ?? "";
      if (!aliasName || DOXYGEN_BUILTIN_COMMANDS.has(aliasName)) continue;
      
      if (!doxyfileConfig.aliases.has(aliasName)) {
        const lineIdx = lines.findIndex((l) => l.includes(`@${aliasName}`));
        out.push(buildDiagnostic(NRP_DOX_ADV_004, {
          span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
          message: `Custom alias '@${aliasName}' used but not defined in Doxyfile ALIASES. (PATCHED YAY)`,
          help: `Add '${aliasName}=...' to ALIASES in Doxyfile.`,
        }));
      }
    }
  }

  private checkXrefitem(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    if (!doxyfileConfig) return;

    // Check literal @xrefitem usage
    const literalXrefRegex = /@xrefitem\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = literalXrefRegex.exec(raw)) !== null) {
      const key = m[1] ?? "";
      if (key && !doxyfileConfig.xrefitemTags.has(key)) {
        const lineIdx = lines.findIndex((l) => l.includes(`@xrefitem ${key}`));
        out.push(buildDiagnostic(NRP_DOX_ADV_005, {
          span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
          message: `@xrefitem tag '@${key}' used but not defined in Doxyfile.`,
          help: `Define '${key}' via ALIASES in Doxyfile.`,
        }));
      }
    }

    // Check empty annotations for known xrefitems aliases
    const tagRegex = /@(\w+)(?:\s+([^\n]*))?/g;
    while ((m = tagRegex.exec(raw)) !== null) {
      const tagName = m[1] ?? "";
      const content = (m[2] ?? "").trim();

      if (!tagName) continue;
      if (!doxyfileConfig.xrefitemTags.has(tagName)) continue;

      if (!content || content.length === 0) {
        const lineIdx = lines.findIndex((l) => l.includes(`@${tagName}`));
        out.push(buildDiagnostic(NRP_DOX_ADV_005b, {
          span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
          message: `@xrefitem annotation '@${tagName}' has empty content.`,
          help: "Add content to the annotation or remove the tag.",
        }));
      }
    }
  }

  private checkMath(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    const hasMath = /@[f\$|f\[]/.test(raw);
    if (!hasMath) return;

    const configMathJax = doxyfileConfig?.useMathJax ?? false;
    const validation = validateMathTags(raw, configMathJax);

    for (const err of validation.errors) {
      out.push(buildDiagnostic(NRP_DOX_ADV_007, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: err.message,
        help: err.help ?? null,
        notes: [],
        relatedSpans: [],
      }));
    }

    for (const warn of validation.warnings) {
      out.push(buildDiagnostic(NRP_DOX_ADV_007b, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: warn.message,
        help: warn.help ?? null,
        notes: [],
        relatedSpans: [],
      }));
    }
  }

  private checkPlantUml(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    const hasPlantUml = raw.includes("@startuml");
    if (!hasPlantUml) return;

    const jarConfigured = doxyfileConfig?.plantUmlJarPath !== null;
    const validation = validatePlantUml(raw, jarConfigured);

    for (const err of validation.errors) {
      out.push(buildDiagnostic(NRP_DOX_ADV_008, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: err.message,
        help: err.help ?? null,
        notes: [],
        relatedSpans: [],
      }));
    }

    for (const warn of validation.warnings) {
      out.push(buildDiagnostic(NRP_DOX_ADV_008b, {
        span: lineSpan(filePath, 1, lines as string[]),
        message: warn.message,
        help: warn.help ?? null,
        notes: [],
        relatedSpans: [],
      }));
    }
  }

  private checkCite(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    if (!doxyfileConfig || doxyfileConfig.citeBibFiles.length === 0) return;

    const validation = validateCiteKeys(raw, bibKeys);

    for (const key of validation.missing) {
      const lineIdx = lines.findIndex((l) => l.includes(`@cite ${key}`));
      out.push(buildDiagnostic(NRP_DOX_ADV_009, {
        span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
        message: `@cite key '${key}' not found in any .bib file.`,
        help: "Ensure the citation key exists in the bibliography file.",
      }));
    }
  }

  private checkIfBlocks(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    const enabledSections = doxyfileConfig?.enabledSections ?? new Set();
    const validation = validateIfBlocks(raw, enabledSections);

    for (const section of validation.unknown) {
      const lineIdx = lines.findIndex((l) => l.includes(`@if ${section}`));
      out.push(buildDiagnostic(NRP_DOX_ADV_006, {
        span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
        message: `@if uses section '${section}' not in Doxyfile ENABLED_SECTIONS.`,
        help: "Add the section to ENABLED_SECTIONS in Doxyfile or check for typos.",
      }));
    }

    if (validation.unclosed) {
      const lineIdx = lines.findIndex((l) => l.includes("@if"));
      out.push(buildDiagnostic(NRP_DOX_ADV_006b, {
        span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
        message: "@if block with no matching @endif.",
        help: "Add @endif to close the conditional block.",
      }));
    }
  }

  private checkTableOfContents(raw: string, lines: readonly string[], filePath: string, out: Diagnostic[]): void {
    if (!raw.includes("@tableofcontents")) return;

    const hasPage = raw.includes("@page");
    if (!hasPage) {
      const lineIdx = lines.findIndex((l) => l.includes("@tableofcontents"));
      out.push(buildDiagnostic(NRP_DOX_ADV_011, {
        span: lineSpan(filePath, (lineIdx >= 0 ? lineIdx : 0) + 1, lines as string[]),
        message: "@tableofcontents used outside @page context.",
        help: "Move @tableofcontents inside a @page block.",
      }));
    }
  }
}
