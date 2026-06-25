// File: medichain/blockchain/hardhat.config.js
// Hardhat configuration for MediChain — supports local dev node and Sepolia testnet

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // loads PRIVATE_KEY and SEPOLIA_RPC_URL from .env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // ── Solidity compiler ───────────────────────────────────────────────────────
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // optimise for ~200 function calls (typical contract lifetime)
      },
    },
  },

  // ── Networks ────────────────────────────────────────────────────────────────
  networks: {
    // Local Hardhat node — started with: npx hardhat node
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Ethereum Sepolia testnet (for staging/demo)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts:
        process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_metamask_private_key_here"
          ? [`0x${process.env.PRIVATE_KEY}`]
          : [], // guard against accidental empty-key deployment
      chainId: 11155111,
    },
  },

  // ── Gas Reporter ────────────────────────────────────────────────────────────
  // Shows gas cost of each function call during `npx hardhat test`
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },

  // ── Solidity Coverage ───────────────────────────────────────────────────────
  // Run: npx hardhat coverage
  // Report written to ./coverage/index.html
  // (configured automatically by hardhat-toolbox)

  // ── Paths ───────────────────────────────────────────────────────────────────
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
