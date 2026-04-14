/**
 * @file rules.ts
 * @brief Static rule descriptors for the CRYPTO category (NRP-CRYPTO-001 to NRP-CRYPTO-009).
 *
 * @remarks
 * Platform-specific cryptographic safety rules for Nirapod firmware.
 * These rules catch insecure zeroization, key leaks in logs, unzeroed
 * buffers, IV reuse, and platform-specific API misuse on CC310/CC312/ESP32.
 *
 * All crypto rules apply exclusively to C/C++ files.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, PLATFORM_CRYPTO, EMBEDDED_SKILL, NASA_SAFETY } from "../refs.js";

/** Shared language scope for all crypto rules. */
const LANG_C_CPP = ["c", "cpp"] as const;

/** memset() used to clear crypto buffer. */
export const NRP_CRYPTO_001: Rule = {
  id: "NRP-CRYPTO-001",
  category: "CRYPTO",
  severity: "error",
  title: "memset-zeroization",
  description: "memset() used to clear a crypto buffer (may be optimized away).",
  rationale:
    "The compiler may optimize away memset() when the buffer is not read " +
    "afterwards. Key material left in memory is a side-channel attack vector. " +
    "Use explicit_bzero() or mbedtls_platform_zeroize() which are guaranteed " +
    "not to be optimized out.",
  references: [
    ref("Memory Safety Checklist", EMBEDDED_SKILL, "Part 6 — Memory Safety Checklist"),
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "Zeroization"),
  ],
  languages: [...LANG_C_CPP],
};

/** Key material passed to a log/print function. */
export const NRP_CRYPTO_002: Rule = {
  id: "NRP-CRYPTO-002",
  category: "CRYPTO",
  severity: "error",
  title: "key-in-log",
  description: "Key handle, key buffer, or entropy variable passed to a log/print function.",
  rationale:
    "Logging key material writes secrets to non-volatile storage (flash, UART, " +
    "syslog). Even debug logs in development builds can leak into production. " +
    "Never log key handles, buffers, or entropy sources.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "Key Material Handling"),
  ],
  languages: [...LANG_C_CPP],
};

/** Local crypto buffer not zeroed on some return path. */
export const NRP_CRYPTO_003: Rule = {
  id: "NRP-CRYPTO-003",
  category: "CRYPTO",
  severity: "error",
  title: "crypto-buf-not-zeroed",
  description: "Local crypto buffer exits function on some path without being zeroed.",
  rationale:
    "A crypto buffer left on the stack after function return can be read by " +
    "subsequent function calls that reuse the same stack frame. Every crypto " +
    "buffer must be zeroed on every exit path, including error paths.",
  references: [
    ref("Memory Safety Checklist", EMBEDDED_SKILL, "Part 6 — Memory Safety Checklist"),
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "Zeroization"),
  ],
  languages: [...LANG_C_CPP],
};

/** const buffer passed directly to nrf_crypto_* API. */
export const NRP_CRYPTO_004: Rule = {
  id: "NRP-CRYPTO-004",
  category: "CRYPTO",
  severity: "error",
  title: "flash-buf-to-nrf-crypto",
  description: "const (flash-resident) buffer passed directly to nrf_crypto_* API.",
  rationale:
    "CryptoCell DMA cannot read from flash memory regions. Passing a const " +
    "pointer (which the linker may place in flash) to nrf_crypto causes a " +
    "hard fault or silent data corruption. Copy to a RAM buffer first.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "CC310/CC312 DMA Constraints"),
  ],
  languages: [...LANG_C_CPP],
};

/** HW AES function called without visible mutex acquire. */
export const NRP_CRYPTO_005: Rule = {
  id: "NRP-CRYPTO-005",
  category: "CRYPTO",
  severity: "warning",
  title: "esp32-no-mutex",
  description: "Hardware crypto function called without visible mutex acquire in function scope.",
  rationale:
    "CryptoCell and ESP32 hardware crypto peripherals are not reentrant. " +
    "Concurrent access from multiple threads causes data corruption. " +
    "Acquire a mutex before any hardware crypto operation.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "Thread Safety"),
  ],
  languages: [...LANG_C_CPP],
};

/** Direct CC312 register access from non-secure context. */
export const NRP_CRYPTO_006: Rule = {
  id: "NRP-CRYPTO-006",
  category: "CRYPTO",
  severity: "error",
  title: "cc312-direct-register",
  description: "Direct CC312 register write in non-secure context.",
  rationale:
    "On nRF5340, CC312 registers are only accessible from secure-world code. " +
    "Direct register access from non-secure firmware causes a BusFault. " +
    "Use the nrf_cc3xx_platform API instead.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "nRF5340 TrustZone"),
  ],
  languages: [...LANG_C_CPP],
};

/** Same IV/nonce variable reused across two encrypt calls. */
export const NRP_CRYPTO_007: Rule = {
  id: "NRP-CRYPTO-007",
  category: "CRYPTO",
  severity: "error",
  title: "iv-reuse",
  description: "Same IV/nonce variable used in two consecutive encrypt calls in the same scope.",
  rationale:
    "Reusing an IV with the same key in AES-GCM or AES-CTR completely breaks " +
    "confidentiality (XOR of two ciphertexts reveals XOR of plaintexts). " +
    "Generate a fresh IV for every encryption operation.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "IV/Nonce Management"),
  ],
  languages: [...LANG_C_CPP],
};

/** nrf_crypto_* call inside interrupt handler. */
export const NRP_CRYPTO_008: Rule = {
  id: "NRP-CRYPTO-008",
  category: "CRYPTO",
  severity: "error",
  title: "interrupt-crypto",
  description: "nrf_crypto_* call inside interrupt handler (ISR function).",
  rationale:
    "CryptoCell operations take variable time and may block. Calling crypto " +
    "from an ISR blocks all lower-priority interrupts and can cause watchdog " +
    "reset. Defer crypto work to a thread context.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "ISR Constraints"),
  ],
  languages: [...LANG_C_CPP],
};

/** Raw key bytes in public API (should be KeyHandle). */
export const NRP_CRYPTO_009: Rule = {
  id: "NRP-CRYPTO-009",
  category: "CRYPTO",
  severity: "error",
  title: "raw-key-in-api",
  description: "uint8_t key parameter (not KeyHandle) on a public API function.",
  rationale:
    "Public APIs that accept raw key bytes force callers to manage key " +
    "material directly. Use an opaque KeyHandle type that references key " +
    "material stored in a secure enclave or protected memory region.",
  references: [
    ref("Platform Crypto Reference", PLATFORM_CRYPTO, "Key Handle Pattern"),
  ],
  languages: [...LANG_C_CPP],
};

/** All crypto rules as an array for the registry. */
export const CRYPTO_RULES: readonly Rule[] = [
  NRP_CRYPTO_001, NRP_CRYPTO_002, NRP_CRYPTO_003, NRP_CRYPTO_004,
  NRP_CRYPTO_005, NRP_CRYPTO_006, NRP_CRYPTO_007, NRP_CRYPTO_008,
  NRP_CRYPTO_009,
];
