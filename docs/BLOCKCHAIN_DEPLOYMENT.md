# MediChain Blockchain Deployment and Verification Guide

This guide details compilation, local deployment, public testnet (Sepolia) deployment, and client-side integration procedures for the MediChain smart contracts.

---

## 1. Prerequisites

- Node.js v18+
- Hardhat (`npm install --save-dev hardhat` in `blockchain/` directory)
- A MetaMask or Ethereum wallet address with testnet ETH (for public deployments).

---

## 2. Environment Variables (`blockchain/.env`)

Create `blockchain/.env` with the following variables:
```env
# Hex private key of the deployer wallet (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Infura or Alchemy JSON-RPC Sepolia gateway URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_key
```

> [!WARNING]
> Never commit `PRIVATE_KEY` to public repositories. Ensure `blockchain/.env` is included in your `.gitignore` rules.

---

## 3. Compilation & Build Validation

To compile the smart contracts and generate the ABI:
```bash
cd blockchain
npx hardhat compile
```
- Solidity compiler version: `0.8.19` (optimised with `runs: 200`).
- Compilation outputs are saved to `blockchain/artifacts/` and `blockchain/cache/`.

---

## 4. Local Deployment (Simulated Environment)

1. Start the local Hardhat Node (exposes port 8545):
   ```bash
   npx hardhat node
   ```
2. Deploy the smart contract:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
- The deployment script automatically exports the address, network details, and ABI to:
  - `blockchain/deployedContract.json`
  - `frontend/src/contracts/MediChain.json`

---

## 5. Public Testnet Deployment (Sepolia Staging)

1. Fund your deployer account with Sepolia ETH (e.g. from Sepolia Faucets).
2. Deploy using the Sepolia network configuration:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
3. Update the frontend `.env` configuration file:
   ```env
   REACT_APP_CONTRACT_ADDRESS=0xYourDeployedSepoliaContractAddress
   REACT_APP_TARGET_CHAIN_ID=11155111
   ```
4. Configure the Render backend service with:
   ```env
   SEPOLIA_RPC_URL=<your Sepolia JSON-RPC endpoint>
   BLOCKCHAIN_CHAIN_ID=11155111
   CONTRACT_ADDRESS=0x54fb71438b6A79947BE43dFAfB72194619405004
   ```
   This is the Sepolia address documented by the project; confirm it matches
   the intended deployment before using it.
5. The frontend defaults to this documented Sepolia contract when the checked-in
   artifact is a local Hardhat deployment. Set `REACT_APP_CONTRACT_ADDRESS` in
   Vercel to override it explicitly when deploying a different contract.
6. Complete the patient-controlled authorization flow using either method:
   - **On-chain:** patient and doctor link verified wallets. The patient registers
     their wallet on-chain and grants access to the doctor's verified wallet.
   - **Patient account:** a patient without MetaMask can review a doctor's request
     in **Access** and approve it from their authenticated MediChain account.
     This account-based grant permits record viewing and uploads for 30 days and
     can be revoked at any time from **Access**.
   - The doctor scans the QR, uploads its image, or enters the patient ID. If no
     active grant exists, the doctor can request patient approval. Patient details
     stay hidden until the patient approves; a MetaMask connection by itself does
     not grant access.
   Keep the RPC endpoint's provider key in Render's environment settings; do not
   commit it. `BLOCKCHAIN_RPC_URL`, when set, takes precedence over
   `SEPOLIA_RPC_URL`. Production does not fall back to a local Hardhat node or
   the local address in the checked-in deployment artifacts.

---

## 6. Verification and Security Features

### Pagination Guard
The `getPatientsPaginated(uint offset, uint limit)` function prevents gas exhaustion by avoiding unbounded array fetches.

### Authorization Enforcement
The `onlyAuthorizedDoctor(address patientAddress)` modifier enforces on-chain permission logic.
- Verify contract security using automated unit tests:
  ```bash
  npx hardhat test
  ```
