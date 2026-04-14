// Intentional NRP-MEM violations for testing.
#pragma once

#include <stdint.h>
#include <stddef.h>

void deref_without_null_check(uint8_t* buf, size_t len) {
    buf->data = 0;  // NRP-MEM-002: no NIRAPOD_ASSERT(buf != NULL)
}

void narrow_size(size_t big_size) {
    int small_size = (int)big_size;  // NRP-MEM-004: narrowing without range check
}
