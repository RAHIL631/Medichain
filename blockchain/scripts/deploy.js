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
  // 1) Get deployer signer and ContractFactory for "MediChain"
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const MediChain = await ethers.getContractFactory("MediChain");

  // 2) Deploy the contract
  const medichain = await MediChain.deploy();

  // 3) Wait for deployment to confirm
  await medichain.waitForDeployment();

  // 4) Get deployed contract address
  const address = await medichain.getAddress();

  // 5) Get deployment receipt for block number & tx hash
  const deployedAt = new Date().toISOString();
  let blockNumber = 0;
  let txHash = "";
  const deploymentTx = medichain.deploymentTransaction();
  if (deploymentTx) {
    txHash = deploymentTx.hash;
    const receipt = await deploymentTx.wait();
    if (receipt && typeof receipt.blockNumber === "number") blockNumber = receipt.blockNumber;
  }

  // 6) Get the contract ABI from the artifact
  const artifact = await artifacts.readArtifact("MediChain");

  const exportData = {
    contractName: "MediChain",
    address,
    network: network.name || "unknown",
    chainId: Number(net.chainId),
    deployer: deployer.address,
    txHash,
    blockNumber,
    compilerVersion: "0.8.19",
    deployedAt,
    abi: artifact.abi,
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
  console.log(`Contract: ${exportData.contractName}`);
  console.log(`Network:  ${exportData.network} (Chain ID: ${exportData.chainId})`);
  console.log(`Address:  ${exportData.address}`);
  console.log(`Deployer: ${exportData.deployer}`);
  console.log(`Tx Hash:  ${exportData.txHash}`);
  console.log(`Block:    ${exportData.blockNumber}`);
  console.log(`Compiler: ${exportData.compilerVersion}`);
  console.log(`Time:     ${exportData.deployedAt}`);
  console.log(
    "ABI exported to: deployedContract.json + frontend/src/contracts/MediChain.json"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
