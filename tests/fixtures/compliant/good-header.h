/**
 * @file good-header.h
 * @brief Hardware-accelerated AES-256-GCM driver for CC310 and CC312 targets.
 *
 * @details
 * Wraps the nrf_crypto AES API and adds buffer zeroization on every exit path.
 * Supports both nRF52840 (CC310) and nRF5340 (CC312, via PSA Crypto). The
 * driver does not touch the hardware directly; it calls the Nordic SDK
 * abstraction layer.
 *
 * @author Nirapod Team
 * @date 2026
 * @version 0.1.0
 *
 * @ingroup CryptoDrivers
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */
#pragma once

#include <stddef.h>
#include <stdint.h>

/**
 * @brief Encrypts plaintext with AES-256-GCM using the specified key handle.
 *
 * @details
 * Generates a 12-byte random IV internally via the platform CSPRNG. The output
 * format is `[IV (12)][ciphertext (N)][GCM tag (16)]`.
 *
 * @param[in]  key_handle  Opaque handle to the 256-bit key in the secure
 * element.
 * @param[in]  plaintext   Input buffer to encrypt. Must not be NULL.
 * @param[in]  len         Length of the plaintext buffer in bytes. Max 65535.
 * @param[out] out         Output buffer. Caller allocates at least `len + 28`
 * bytes.
 * @param[out] out_len     Actual number of bytes written to `out`.
 *
 * @return 0 on success, negative error code on failure.
 * @retval -1  Key handle invalid or expired.
 * @retval -2  Plaintext exceeds maximum length (65535 bytes).
 * @retval -3  CSPRNG failure during IV generation.
 *
 * @pre `key_handle` was obtained via `key_store_resolve()` and has not been
 * rotated.
 * @post `out` contains the sealed ciphertext. The internal key buffer is
 * zeroed.
 *
 * @note CC310 DMA requires the plaintext buffer to be in RAM, not flash.
 * @warning Do not call from an ISR context.
 *
 * @see key_store_resolve() for obtaining a valid key handle.
 * @see decrypt_gcm() for the corresponding decryption function.
 */
int encrypt_gcm(uint32_t key_handle, const uint8_t *plaintext, size_t len,
                uint8_t *out, size_t *out_len);
