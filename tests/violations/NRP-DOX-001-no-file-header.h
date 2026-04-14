#pragma once

// This file tests NRP-DOX rules. It has:
//   - struct with no @struct block → NRP-DOX-008
//   - struct fields without ///< → NRP-DOX-009
//   - function with missing @param, @return → NRP-DOX-014, NRP-DOX-015
//   - No @file block → NRP-DOX-001

#include <stdint.h>
#include <stddef.h>

struct PacketHeader {
    uint8_t version;
    uint8_t msg_type;
    uint16_t seq;
    uint32_t timestamp_ms;
};

int parse_header(const uint8_t* data, size_t len, struct PacketHeader* out);

void reset_parser(void);
