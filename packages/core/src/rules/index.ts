/**
 * @file index.ts
 * @brief Central rule registry aggregating all rule descriptors from every category.
 *
 * @remarks
 * Import `ALL_RULES` to get the full list, or import individual category
 * arrays when you need a subset. The registry is used by the CLI `rules`
 * command and by the pipeline to resolve severity overrides.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { LICENSE_RULES } from "./license/rules.js";
import { DOXYGEN_RULES } from "./doxygen/rules.js";
import { STYLE_RULES } from "./style/rules.js";
import { NASA_RULES } from "./nasa/rules.js";
import { CRYPTO_RULES } from "./crypto/rules.js";
import { MEMORY_RULES } from "./memory/rules.js";

export { LICENSE_RULES } from "./license/rules.js";
export { DOXYGEN_RULES } from "./doxygen/rules.js";
export { STYLE_RULES } from "./style/rules.js";
export { NASA_RULES } from "./nasa/rules.js";
export { CRYPTO_RULES } from "./crypto/rules.js";
export { MEMORY_RULES } from "./memory/rules.js";

/**
 * Every rule defined in the nirapod-audit system.
 *
 * @remarks
 * This array grows as new passes and rule categories are implemented.
 * Phase 1 includes LICENSE and STYLE rules; later phases add DOXYGEN,
 * NASA, CRYPTO, and MEMORY.
 */
export const ALL_RULES: readonly Rule[] = [
  ...LICENSE_RULES,
  ...DOXYGEN_RULES,
  ...NASA_RULES,
  ...CRYPTO_RULES,
  ...MEMORY_RULES,
  ...STYLE_RULES,
];

/**
 * Look up a rule descriptor by its ID string.
 *
 * @param id - Rule identifier, e.g. `"NRP-LIC-001"`.
 * @returns The matching {@link Rule}, or `undefined` if no rule has that ID.
 */
export function findRule(id: string): Rule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}
