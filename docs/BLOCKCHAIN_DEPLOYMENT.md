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
