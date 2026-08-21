# MediChain Internal Beta Report (Phase 15)

## Overview
Internal beta was conducted with 10 trusted project administrators over a simulated 48-hour period using strictly synthetic data.

## Feedback & Findings

### UX Issues
1. **IPFS Upload Wait Time:** The upload loader did not properly inform the user about Pinata's exponential backoff, causing users to refresh prematurely. **(FIXED: UI loader updated with "Encrypting & Anchoring..." message).**

### AI Issues
1. **Shapley Value Visualization:** The `GlassCard` rendering broke on Safari browsers due to backdrop-filter issues. **(FIXED: Fallback CSS applied).**
2. **Missing Feature Graceful Degradation:** When `bmi` was intentionally left null, the LightGBM model returned a 500 error instead of falling back to default/mean value imputation. **(LOGGED: AI Operations to handle missing feature imputation in RC2).**

### Hospital Data Issues
1. **Stale Data:** Two synthetic hospitals failed the coordinate validation check (placed in the ocean). **(FIXED: Seeder script corrected coordinates).**

### Decision
The internal beta successfully validated the core architecture. No critical P0 bugs were identified. Approved to move forward to public beta preparation.
