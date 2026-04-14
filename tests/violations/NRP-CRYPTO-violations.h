// Intentional NRP-CRYPTO violations for testing.
#pragma once

#include <string.h>
#include <stdio.h>

#define KEY_SIZE 32

void insecure_zeroize() {
    uint8_t key_buf[KEY_SIZE];
    // ... use key_buf for encryption ...
    memset(key_buf, 0, sizeof(key_buf));  // NRP-CRYPTO-001: should use explicit_bzero
}

void leak_key_to_log() {
    uint8_t key_material[32];
    // ... derive key ...
    printf("Key: %p\n", key_material);  // NRP-CRYPTO-002: key in log
    LOG_DBG("secret: %s", secret);
}

void hw_crypto_no_mutex() {
    nrf_crypto_aes_init(NULL, NULL, 0);  // NRP-CRYPTO-005: no mutex
}

void reuse_iv() {
    uint8_t iv[16];
    // First call
    nrf_crypto_aes_crypt_ecb(NULL, iv, NULL, NULL);
    // Second call with SAME iv — NRP-CRYPTO-007
    nrf_crypto_aes_crypt_ecb(NULL, iv, NULL, NULL);
}
