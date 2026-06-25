// File: medichain/blockchain/scripts/deploy.js
//
// Deploy MediChain.sol and export address + ABI for frontend consumption.
//
// Commands:
// 1) Start Hardhat node:
//    npx hardhat node
// 2) Deploy to localhost:
//    npx hardhat run scripts/deploy.js --network localhost
// 3) Deploy to Sepolia:
//    npx hardhat run scripts/deploy.js --network sepolia

const { ethers, artifacts, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 1) Get the ContractFactory for "MediChain"
  const MediChain = await ethers.getContractFactory("MediChain");

  // 2) Deploy the contract
  const medichain = await MediChain.deploy();

  // 3) Wait for deployment to confirm
  await medichain.waitForDeployment();

  // 4) Get deployed contract address
  const address = await medichain.getAddress();

  // 5) Get deployment receipt for block number (best-effort)
  const deployedAt = new Date().toISOString();
  let blockNumber = 0;
  const deploymentTx = medichain.deploymentTransaction();
  if (deploymentTx) {
    const receipt = await deploymentTx.wait();
    if (receipt && typeof receipt.blockNumber === "number") blockNumber = receipt.blockNumber;
  }

  // 6) Get the contract ABI from the artifact
  const artifact = await artifacts.readArtifact("MediChain");

  const exportData = {
    address,
    abi: artifact.abi,
    network: network.name || "unknown",
    deployedAt,
  };

  // 7a) Write medichain/blockchain/deployedContract.json
  const blockchainOutPath = path.join(__dirname, "..", "deployedContract.json");
  fs.writeFileSync(blockchainOutPath, JSON.stringify(exportData, null, 2));

  // 7b) Write medichain/frontend/src/contracts/MediChain.json (create folder if missing)
  const frontendContractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
  fs.mkdirSync(frontendContractsDir, { recursive: true });
  const frontendOutPath = path.join(frontendContractsDir, "MediChain.json");
  fs.writeFileSync(frontendOutPath, JSON.stringify(exportData, null, 2));

  // 8) Console.log deployment summary
  console.log("===== MediChain Deployed =====");
  console.log(`Network:  ${exportData.network}`);
  console.log(`Address:  ${exportData.address}`);
  console.log(`Block:    ${blockNumber}`);
  console.log(`Time:     ${exportData.deployedAt}`);
  console.log(
    "ABI exported to: deployedContract.json + frontend/src/contracts/MediChain.json"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
