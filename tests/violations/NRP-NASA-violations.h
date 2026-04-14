// This file intentionally violates NASA rules for testing.
// No file-level Doxygen block (that's tested separately).

#pragma once

#include <stdlib.h>
#include <setjmp.h>

#define MAX_BUF_SIZE 256
#define SQUARE(x) ((x) * (x))

jmp_buf jump_buffer;

int global_counter = 0;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);  // direct recursion
}

void use_goto() {
    int i = 0;
    goto cleanup;  // goto statement
cleanup:
    i = 1;
}

void use_setjmp() {
    if (setjmp(jump_buffer) == 0) {
        longjmp(jump_buffer, 1);
    }
}

void use_malloc() {
    int* buf = (int*)malloc(sizeof(int) * 10);
    free(buf);
}

void unbounded_loop() {
    int x = 100;
    while (x > 0) {
        x--;
    }
}

void very_long_function() {
    int a = 0;
    int b = 1;
    int c = 2;
    int d = 3;
    int e = 4;
    int f = 5;
    int g = 6;
    int h = 7;
    int i = 8;
    int j = 9;
    int k = 10;
    int l = 11;
    int m = 12;
    int n = 13;
    int o = 14;
    int p = 15;
    int q = 16;
    int r = 17;
    int s = 18;
    int t = 19;
    int u = 20;
    int v = 21;
    int w = 22;
    int x = 23;
    int y = 24;
    int z = 25;
    a = b + c;
    b = c + d;
    c = d + e;
    d = e + f;
    e = f + g;
    f = g + h;
    g = h + i;
    h = i + j;
    i = j + k;
    j = k + l;
    k = l + m;
    l = m + n;
    m = n + o;
    n = o + p;
    o = p + q;
    p = q + r;
    q = r + s;
    r = s + t;
    s = t + u;
    t = u + v;
    u = v + w;
    v = w + x;
    w = x + y;
    x = y + z;
    y = z + a;
    z = a + b;
    a = b + c + d;
    b = c + d + e;
    c = d + e + f;
    d = e + f + g;
    e = f + g + h;
    f = g + h + i;
    g = h + i + j;
    h = i + j + k;
    i = j + k + l;
    j = k + l + m;
}
