/**
 * @file doxygen.ts
 * @brief Doxyfile parser and utilities for advanced Doxygen rule evaluation.
 *
 * @remarks
 * Parses Doxyfile to extract ALIASES, xrefitem definitions, ENABLED_SECTIONS,
 * CITE_BIB_FILES, TAGFILES, USE_MATHJAX, PLANTUML_JAR_PATH, and GENERATE_TAGFILE.
 * This infrastructure is shared across multiple advanced rules.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Diagnostic } from "@nirapod-audit/protocol";
import path from "node:path";
import fs from "node:fs";

export interface DoxyfileConfig {
  aliases: Map<string, string>;
  xrefitemTags: Set<string>;
  enabledSections: Set<string>;
  citeBibFiles: string[];
  tagFiles: TagFileEntry[];
  useMathJax: boolean;
  plantUmlJarPath: string | null;
  generateTagFile: string | null;
}

export interface TagFileEntry {
  tagFilePath: string;
  urlMapping: string | null;
}

export interface CopydocTarget {
  symbolName: string;
  docBlock: string;
  resolved: boolean;
}

function unquote(val: string): string {
  return val.replace(/^["']|["']$/g, "").trim();
}

function parseDoxyfileValue(line: string): { key: string; value: string; append: boolean } | null {
  const match = line.match(/^\s*(\w+)\s*(\+?=)\s*(.*)$/);
  if (!match) return null;
  const key = match[1];
  const append = match[2] === "+=";
  const value = match[3]?.trim() ?? "";
  if (!key) return null;
  return { key, value, append };
}

function parseAliasValue(value: string): Map<string, string> {
  const aliases = new Map<string, string>();
  const regex = /(\w+)\s*=\s*([^\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(value)) !== null) {
    const name = m[1] ?? "";
    const raw = m[2] ?? "";
    if (!name) continue;
    const expanded = unquote(raw).replace(/\\"/g, '"').replace(/\\n/g, "\n");
    aliases.set(name, expanded);
  }
  return aliases;
}

export function loadDoxyfile(
  doxyfilePath: string | null,
  projectRoot: string,
): DoxyfileConfig | null {
  const config: DoxyfileConfig = {
    aliases: new Map(),
    xrefitemTags: new Set(),
    enabledSections: new Set(),
    citeBibFiles: [],
    tagFiles: [],
    useMathJax: false,
    plantUmlJarPath: null,
    generateTagFile: null,
  };

  if (!doxyfilePath) return null;

  const fullPath = path.isAbsolute(doxyfilePath)
    ? doxyfilePath
    : path.join(projectRoot, doxyfilePath);

  if (!fs.existsSync(fullPath)) return null;

  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;

    const kv = parseDoxyfileValue(line);
    if (!kv) continue;

    const { key, value, append } = kv;
    const unquoted = unquote(value);

    switch (key) {
      case "ALIASES":
        const newAliases = parseAliasValue(unquoted);
        if (!append && config.aliases.size > 0) {
           config.aliases.clear();
        }
        for (const [name, replacement] of newAliases) {
          config.aliases.set(name, replacement);
          if (replacement.includes("xrefitem ")) {
            config.xrefitemTags.add(name);
          }
        }
        break;
      case "ENABLED_SECTIONS":
        for (const section of unquoted.split(/[\s,]+/)) {
          if (section) config.enabledSections.add(section);
        }
        break;
      case "CITE_BIB_FILES":
        for (const f of unquoted.split(/[\s,]+/)) {
          if (f) config.citeBibFiles.push(f);
        }
        break;
      case "TAGFILES":
        for (const entry of unquoted.split(/[\s,]+/)) {
          if (!entry) continue;
          const parts = entry.split(/=(.*)$/);
          if (parts.length === 2) {
            const tagPath = parts[0] ?? "";
            const urlMap = parts[1] ?? null;
            config.tagFiles.push({
              tagFilePath: path.isAbsolute(tagPath)
                ? tagPath
                : path.join(projectRoot, tagPath),
              urlMapping: urlMap,
            });
          }
        }
        break;
      case "USE_MATHJAX":
        config.useMathJax = unquoted.toLowerCase() === "yes";
        break;
      case "PLANTUML_JAR_PATH":
        config.plantUmlJarPath = unquoted || null;
        break;
      case "GENERATE_TAGFILE":
        config.generateTagFile = unquoted || null;
        break;
    }
  }

  return config;
}

export function expandAliases(
  docBlock: string,
  aliases: Map<string, string>,
): string {
  let expanded = docBlock;
  for (const [name, replacement] of aliases) {
    const regex = new RegExp(`@${name}\\b`, "g");
    expanded = expanded.replace(regex, replacement);
  }
  return expanded;
}

export function findCopydocTarget(
  symbolName: string,
  allFiles: string[],
  linesByFile: Map<string, string[]>,
): CopydocTarget | null {
  for (const filePath of allFiles) {
    const lines = linesByFile.get(filePath);
    if (!lines) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (!line.includes("/**") && !line.includes("/*!")) continue;

      let j = i;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (!nextLine) break;
        if (nextLine.includes("*/")) break;
        j++;
      }
      if (j >= lines.length) continue;

      const block = lines.slice(i, j + 1).join("\n");

      const atFunction = block.match(/@fn\s+(\w+)/);
      const atClass = block.match(/@class\s+(\w+)/);
      const atStruct = block.match(/@struct\s+(\w+)/);
      const atEnum = block.match(/@enum\s+(\w+)/);

      const found =
        atFunction?.[1] === symbolName ||
        atClass?.[1] === symbolName ||
        atStruct?.[1] === symbolName ||
        atEnum?.[1] === symbolName;

      if (found) {
        return { symbolName, docBlock: block, resolved: true };
      }

      i = j;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (!line.includes(symbolName)) continue;

      const fnMatch = line.match(
        /^\s*(?:static\s+)?(?:inline\s+)?(?:unsigned\s+|int8_t|uint8_t|int16_t|uint16_t|int32_t|uint32_t|int64_t|uint64_t|bool|void|char|float|double)\s+(\w+)\s*\([^)]*\)\s*;/,
      );
      if (fnMatch?.[1] === symbolName) {
        return { symbolName, docBlock: line, resolved: true };
      }

      const macroMatch = line.match(/^\s*#\s*define\s+(\w+)/);
      if (macroMatch?.[1] === symbolName) {
        return { symbolName, docBlock: line, resolved: true };
      }
    }
  }
  return null;
}

export function resolveCopydoc(
  docBlock: string,
  currentSymbol: string,
  allFiles: string[],
  linesByFile: Map<string, string[]>,
  maxDepth: number = 3,
): { resolved: string; depth: number; error?: string } {
  let depth = 0;
  let current = docBlock;
  let chained = currentSymbol;

  while (depth < maxDepth) {
    const match = current.match(/@copydoc\s+(\w+)/);
    if (!match) break;

    const targetName = match[1] ?? "";
    if (targetName === chained) {
      return { resolved: current, depth, error: "self-referential @copydoc" };
    }

    const target = findCopydocTarget(targetName, allFiles, linesByFile);
    if (!target) {
      return { resolved: current, depth, error: `dangling @copydoc reference to '${targetName}'` };
    }

    chained = targetName;
    current = target.docBlock;
    depth++;
  }

  if (depth >= maxDepth) {
    return { resolved: docBlock, depth: maxDepth, error: "@copydoc chain exceeds maximum depth" };
  }

  return { resolved: current, depth };
}

export function checkSnippetFile(
  snippetRef: string,
  projectRoot: string,
): { filePath: string; tagName: string; valid: boolean; error?: string } {
  const match = snippetRef.match(/^(.+?)\s+(\w+)$/);
  if (!match) {
    return { filePath: "", tagName: "", valid: false, error: "invalid @snippet format" };
  }

  const match1 = match[1] ?? "";
  const match2 = match[2] ?? "";
  const filePath = path.isAbsolute(match1)
    ? match1
    : path.join(projectRoot, match1);
  const tagName = match2;

  if (!filePath) {
    return { filePath: "", tagName: "", valid: false, error: "invalid @snippet format" };
  }

  if (!fs.existsSync(filePath)) {
    return { filePath, tagName, valid: false, error: "snippet file not found" };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const tagMarker = `//! [${tagName}]`;
  if (!content.includes(tagMarker)) {
    return { filePath, tagName, valid: false, error: "snippet tag not found" };
  }

  return { filePath, tagName, valid: true };
}

export function validateMathTags(
  docBlock: string,
  useMathJax: boolean,
): { hasMath: boolean; errors: Diagnostic[]; warnings: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const hasMath = /@[f\$|f\[]/.test(docBlock);

  let inBlockMath = false;
  const lines = docBlock.split("\n");
  for (const line of lines) {
    if (line.includes("@f[")) inBlockMath = true;
    if (line.includes("@f]") && !inBlockMath) {
      errors.push({
        rule: {} as any,
        span: {} as any,
        message: "unclosed @f[ block",
        notes: [],
        help: "Add @f] to close the block math",
        relatedSpans: [],
      });
    }
    if (line.includes("@f]")) inBlockMath = false;
  }

  if (hasMath && !useMathJax) {
    warnings.push({
      rule: {} as any,
      span: {} as any,
      message: "math tags present but MathJax disabled",
      notes: [],
      help: "Enable USE_MATHJAX=YES in Doxyfile",
      relatedSpans: [],
    });
  }

  return { hasMath, errors, warnings };
}

export function validatePlantUml(
  docBlock: string,
  jarConfigured: boolean,
): { hasPlantUml: boolean; errors: Diagnostic[]; warnings: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const hasStart = docBlock.includes("@startuml");
  const hasEnd = docBlock.includes("@enduml");

  if (hasStart && !hasEnd) {
    errors.push({
      rule: {} as any,
      span: {} as any,
      message: "@startuml without @enduml",
      notes: [],
      help: "Add @enduml to close the diagram",
      relatedSpans: [],
    });
  }

  if (hasStart && !jarConfigured) {
    warnings.push({
      rule: {} as any,
      span: {} as any,
      message: "PlantUML diagrams present but jar not configured",
      notes: [],
      help: "Set PLANTUML_JAR_PATH in Doxyfile",
      relatedSpans: [],
    });
  }

  return { hasPlantUml: hasStart, errors, warnings };
}

export function validateCiteKeys(
  docBlock: string,
  bibKeys: Set<string>,
): { missing: string[]; used: Set<string> } {
  const regex = /@cite\s+(\w+)/g;
  const used = new Set<string>();
  const missing: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = regex.exec(docBlock)) !== null) {
    const key = m[1] ?? "";
    if (!key) continue;
    used.add(key);
    if (!bibKeys.has(key)) {
      missing.push(key);
    }
  }

  return { missing, used };
}

export function validateIfBlocks(
  docBlock: string,
  enabledSections: Set<string>,
): { unknown: string[]; unclosed: boolean } {
  const unknown: string[] = [];
  const ifRegex = /@if\s+(\w+)/g;
  const endifRegex = /@endif\s*(?:\([^)]\))?/g;

  let m: RegExpExecArray | null;
  while ((m = ifRegex.exec(docBlock)) !== null) {
    const sectionName = m[1] ?? "";
    if (!sectionName) continue;
    if (!enabledSections.has(sectionName)) {
      unknown.push(sectionName);
    }
  }

  const ifCount = (docBlock.match(ifRegex) || []).length;
  const endifCount = (docBlock.match(endifRegex) || []).length;
  const unclosed = ifCount > endifCount;

  return { unknown, unclosed };
}

export function validateTagFiles(
  tagFiles: TagFileEntry[],
): { missing: TagFileEntry[]; noUrlMapping: TagFileEntry[] } {
  const missing: TagFileEntry[] = [];
  const noUrlMapping: TagFileEntry[] = [];

  for (const entry of tagFiles) {
    if (!fs.existsSync(entry.tagFilePath)) {
      missing.push(entry);
    } else if (!entry.urlMapping) {
      noUrlMapping.push(entry);
    }
  }

  return { missing, noUrlMapping };
}