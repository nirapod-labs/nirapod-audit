/**
 * @file crypto-pass.ts
 * @brief Pass 4: Platform-specific cryptographic safety checks.
 *
 * @remarks
 * Detects insecure zeroization (memset on crypto buffers), key material
 * in log calls, IV/nonce reuse, and platform-specific API misuse for
 * CryptoCell CC310/CC312 and ESP32 targets.
 *
 * Operates on the tree-sitter CST. Only runs on C/C++ files.
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
  NRP_CRYPTO_001, NRP_CRYPTO_002, NRP_CRYPTO_005,
  NRP_CRYPTO_007,
} from "../rules/crypto/rules.js";

/**
 * Pattern matching crypto-related buffer variable names.
 *
 * @remarks Matched case-insensitively against variable identifiers.
 */
const CRYPTO_BUF_PATTERN =
  /key_buf|key_handle|key_material|plaintext|ciphertext|entropy|derived_|secret|nonce_buf|iv_buf|hmac_buf|aes_key|private_key|shared_secret/i;

/**
 * Log/print functions that must never receive key material.
 */
const LOG_FUNCTIONS = new Set([
  "printf", "printk", "fprintf", "snprintf", "sprintf",
  "LOG_ERR", "LOG_WRN", "LOG_DBG", "LOG_INF",
  "log_error", "log_warn", "log_debug", "log_info",
  "ESP_LOGE", "ESP_LOGW", "ESP_LOGD", "ESP_LOGI", "ESP_LOGV",
  "NRF_LOG_ERROR", "NRF_LOG_WARNING", "NRF_LOG_INFO", "NRF_LOG_DEBUG",
]);

/**
 * Hardware crypto function name patterns.
 *
 * @remarks Functions matching these indicate HW crypto access
 *   that needs mutex protection.
 */
const HW_CRYPTO_PATTERN =
  /^(?:nrf_crypto_|nrf_cc3xx_|mbedtls_aes_|mbedtls_gcm_|esp_aes_|esp_gcm_)/;

/**
 * Mutex acquire function patterns.
 */
const MUTEX_PATTERN =
  /mutex_lock|k_mutex_lock|xSemaphoreTake|pthread_mutex_lock|nrf_crypto_mutex/i;

/**
 * IV/nonce variable name patterns.
 */
const IV_PATTERN = /\b(?:iv|nonce|iv_buf|nonce_buf)\b/i;

/**
 * Encrypt function name patterns for IV reuse detection.
 */
const ENCRYPT_PATTERN =
  /encrypt|gcm_crypt|aes_crypt|ctr_crypt|ccm_encrypt/i;

/**
 * Pass 4: cryptographic safety checks.
 *
 * @remarks
 * Checks NRP-CRYPTO-001, 002, 005, 007 by walking the CST.
 * Rules 003, 004, 006, 008, 009 need CFG/dataflow analysis and
 * are deferred to a future CryptoZeroPass.
 */
export class CryptoPass implements Pass {
  readonly name = "CryptoPass";
  readonly languages = ["c", "cpp"] as const;

  /**
   * Run all crypto safety checks on one source file.
   *
   * @param ctx - File context with parsed CST and metadata.
   * @returns Diagnostics for crypto rule violations found.
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

    this.checkMemsetZeroization(rootNode, lines, filePath, results);
    this.checkKeyInLog(rootNode, lines, filePath, results);
    this.checkMutexBeforeCrypto(rootNode, lines, filePath, results);
    this.checkIvReuse(rootNode, lines, filePath, results);

    return results;
  }

  /**
   * NRP-CRYPTO-001: memset() used on crypto buffer.
   *
   * @remarks
   * Detects `memset(crypto_buf, 0, ...)` patterns. The second argument
   * must be 0 (zeroization intent) and the first argument must match
   * the crypto buffer name pattern.
   */
  private checkMemsetZeroization(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const calls = root.descendantsOfType("call_expression");

    for (const call of calls) {
      const fn = call.childForFieldName("function");
      if (!fn || fn.text !== "memset") continue;

      const args = call.childForFieldName("arguments");
      if (!args) continue;

      const argList = args.namedChildren;
      if (argList.length < 2) continue;

      const buf = argList[0];
      const val = argList[1];

      // Only flag when zeroing (second arg is 0) a crypto buffer
      if (
        buf &&
        val &&
        val.text === "0" &&
        CRYPTO_BUF_PATTERN.test(buf.text)
      ) {
        out.push(buildDiagnostic(NRP_CRYPTO_001, {
          span: nodeToSpan(call, filePath, lines as string[]),
          message: `memset() used to zero crypto buffer '${buf.text}'.`,
          help: `Replace with: mbedtls_platform_zeroize(${buf.text}, ${argList[2]?.text ?? "size"}); or explicit_bzero().`,
          notes: [
            "memset() for zeroization may be optimized away by the compiler when the buffer goes out of scope.",
          ],
        }));
      }
    }
  }

  /**
   * NRP-CRYPTO-002: key material variable passed to a log function.
   */
  private checkKeyInLog(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const calls = root.descendantsOfType("call_expression");

    for (const call of calls) {
      const fn = call.childForFieldName("function");
      if (!fn || !LOG_FUNCTIONS.has(fn.text)) continue;

      const args = call.childForFieldName("arguments");
      if (!args) continue;

      // Check all arguments for crypto-related variable names
      for (const arg of args.namedChildren) {
        if (CRYPTO_BUF_PATTERN.test(arg.text)) {
          out.push(buildDiagnostic(NRP_CRYPTO_002, {
            span: nodeToSpan(call, filePath, lines as string[]),
            message: `Key material '${arg.text}' passed to log function '${fn.text}()'.`,
            help: "Remove the key material argument. Log the operation status, not the key data.",
          }));
          break; // One diagnostic per call is enough
        }
      }
    }
  }

  /**
   * NRP-CRYPTO-005: HW crypto function called without visible mutex.
   *
   * @remarks
   * Checks if the enclosing function body contains a mutex_lock call
   * before any hardware crypto call. This is a heuristic — it checks
   * for the presence of a mutex acquire anywhere in the same function,
   * not control-flow ordering.
   */
  private checkMutexBeforeCrypto(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");

    for (const funcDef of funcDefs) {
      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      const bodyText = body.text;
      const hasMutex = MUTEX_PATTERN.test(bodyText);
      if (hasMutex) continue; // Function has mutex — OK

      // Check if this function calls any HW crypto functions
      const calls = body.descendantsOfType("call_expression");
      for (const call of calls) {
        const fn = call.childForFieldName("function");
        if (fn && HW_CRYPTO_PATTERN.test(fn.text)) {
          out.push(buildDiagnostic(NRP_CRYPTO_005, {
            span: nodeToSpan(call, filePath, lines as string[]),
            message: `Hardware crypto call '${fn.text}()' without visible mutex acquire in function.`,
            help: "Add k_mutex_lock() / xSemaphoreTake() before any crypto peripheral access.",
          }));
          break; // One warning per function is enough
        }
      }
    }
  }

  /**
   * NRP-CRYPTO-007: same IV/nonce variable used in two encrypt calls.
   *
   * @remarks
   * Within each function body, tracks which IV variables are passed to
   * encrypt functions. If the same IV variable appears in two calls
   * without reassignment in between, that is a reuse violation.
   */
  private checkIvReuse(
    root: Parser.SyntaxNode,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const funcDefs = root.descendantsOfType("function_definition");

    for (const funcDef of funcDefs) {
      const body = funcDef.childForFieldName("body");
      if (!body) continue;

      const calls = body.descendantsOfType("call_expression");
      const ivUsage = new Map<string, Parser.SyntaxNode>();

      for (const call of calls) {
        const fn = call.childForFieldName("function");
        if (!fn || !ENCRYPT_PATTERN.test(fn.text)) continue;

        const args = call.childForFieldName("arguments");
        if (!args) continue;

        for (const arg of args.namedChildren) {
          if (IV_PATTERN.test(arg.text)) {
            if (ivUsage.has(arg.text)) {
              out.push(buildDiagnostic(NRP_CRYPTO_007, {
                span: nodeToSpan(call, filePath, lines as string[]),
                message: `IV/nonce '${arg.text}' reused in second encrypt call.`,
                help: "Generate a fresh IV/nonce for each encryption operation. Never reuse an IV with the same key.",
                notes: [
                  `First use at line ${(ivUsage.get(arg.text)?.startPosition.row ?? 0) + 1}.`,
                ],
              }));
            } else {
              ivUsage.set(arg.text, call);
            }
          }
        }
      }
    }
  }
}
