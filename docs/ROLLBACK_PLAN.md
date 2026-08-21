# Rollback Plan

## 1. Application Code Rollback (Backend/Frontend)
*   **Trigger:** Elevated 500 error rates post-deployment or critical broken UI.
*   **Action:** 
    1.  Revert traffic to previous Blue/Green environment, OR
    2.  Redeploy previous stable Git tag (`git checkout v1.0.x && docker-compose build`).
*   **Time to execute:** < 2 minutes.

## 2. Database Migration Rollback
*   **Rule:** NO destructive database migrations (e.g., dropping columns/fields) are permitted without a corresponding `down` script.
*   **Action:** Execute the migration `down` step immediately. Restore from snapshot if data corruption occurred.

## 3. Smart Contract Rollback
*   **Rule:** The `MediChain.sol` contract is immutable and NOT proxy-upgradeable by design (to ensure absolute trust).
*   **Action:** 
    1.  If a critical bug is found, a NEW contract must be deployed.
    2.  Users must be migrated to the new contract. 
    3.  A state-migration script must re-register patients and anchor old CIDs to the new contract. This is highly disruptive and requires a maintenance window.
