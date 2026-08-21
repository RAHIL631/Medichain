# Blockchain Staging Protocol (Phase 6)

## 1. Network Strategy
For staging and validation, `MediChain.sol` is deployed to a localized Hardhat Ethereum network.
When transitioning to production, the `hardhat.config.js` will target an L2 (e.g. Polygon Mumbai or Arbitrum Goerli) or an enterprise private chain (Hyperledger Besu).

## 2. Compilation and Testing
*   **Compilation:** The contract was successfully compiled, including recent pagination fixes (`getPatientsPaginated`).
*   **Unit & Security Tests:** Executed via `npx hardhat test`.
*   **Capabilities Validated:**
    *   Patient Registration
    *   Record Integrity Anchoring (IPFS CIDs)
    *   Consent Grant & Revoke workflows
    *   Doctor Authorization Enforcement
    *   Emergency Access

## 3. Deployment Configuration
When spinning up the staging environment, run:
```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
```
*   The output contract address must be set as `CONTRACT_ADDRESS` in both `backend/.env` and `frontend/.env`.
*   The local node URL (`http://127.0.0.1:8545`) must be set as `BLOCKCHAIN_RPC_URL` in `backend/.env`.

## 4. Secret Management
**NEVER** commit `BLOCKCHAIN_PRIVATE_KEY` to the repository. The `.env` variables isolate these secrets.
