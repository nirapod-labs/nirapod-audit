/**
 * @file NRP-STYLE-001-banned-words.h
 * @brief A robust driver that seamlessly leverages hardware acceleration.
 *
 * @details
 * This module utilizes a holistic approach — delving into the multifaceted
 * nature of the cryptographic pipeline to ensure a seamless experience.
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */
#pragma once

#include <stdint.h>

/**
 * @brief Encrypts data.
 * @param[in] buf  Input buffer.
 * @param[in] len  Buffer length in bytes.
 */
void encrypt(const uint8_t *buf, size_t len);
