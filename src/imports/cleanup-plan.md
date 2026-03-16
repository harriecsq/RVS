I want you to CLEAN and REDUCE the codebase for this Neuron project. The repository currently has many unused files, components, and markdown/docs that are not being used, and it is slowing down the system and making maintenance harder.

IMPORTANT RULES:
- Do NOT change any UI visuals, behaviors, routes, data models, or existing features.
- This is a cleanup/refactor only. Output must be functionally identical.
- Make changes in small, verifiable steps. Do not do a “big bang” rewrite.

STEP 1 — INVENTORY + PROOF (no deletions yet)
1) Generate a report of unused code and assets:
   - List all components that are not imported anywhere in the app (directly or indirectly).
   - List all pages/routes that are not reachable from routing/navigation.
   - List all utility functions/modules that are never imported.
   - List all markdown/docs files that are not referenced by the build, app, or README links.
   - List all images/icons/assets that are not referenced by the app.
2) For each item, provide “evidence”:
   - Where you searched
   - Why it appears unused (e.g., zero imports, route not referenced, dead export)
   - Any risk notes (e.g., dynamic imports, lazy loading, string-based route names)

STEP 2 — SAFE DELETE PLAN
Before deleting anything:
- Create a deletion plan grouped by type:
  - Unused components
  - Unused pages
  - Unused utilities
  - Unused assets
  - Unused markdown/docs
- Mark each item as:
  - Safe to delete (no references found)
  - Needs verification (possible dynamic reference)
  - Keep (actually used or referenced indirectly)

STEP 3 — EXECUTE CLEANUP (only after plan is generated)
- Delete ONLY items marked “Safe to delete”.
- Do not delete anything marked “Needs verification” or “Keep”.
- After deletions, ensure:
  - Build passes
  - No imports break
  - No routes break
  - No UI regressions

STEP 4 — CONSOLIDATE + STANDARDIZE
- Remove duplicate components (same function different file) by consolidating to the one actually used.
- Ensure consistent file naming + folder structure (minimal).
- Remove dead exports and unused re-exports (barrel files) if not needed.
- Remove unused dependencies from package configuration if present.

STEP 5 — FINAL SUMMARY
Provide:
- Total files removed
- Total components removed
- Total assets removed
- What you did NOT delete (and why)
- Any remaining “Needs verification” list

START NOW with Step 1 only. Do not delete anything until the inventory + proof report is complete.