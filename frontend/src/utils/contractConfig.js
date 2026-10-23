export const TARGET_CHAIN_ID =
  Number(process.env.REACT_APP_TARGET_CHAIN_ID) || 11155111;

const DOCUMENTED_SEPOLIA_CONTRACT = '0x54fb71438b6A79947BE43dFAfB72194619405004';

export const resolveContractAddress = (artifact) => {
  const rawAddress = process.env.REACT_APP_CONTRACT_ADDRESS?.trim();
  const configuredAddress = rawAddress &&
    !/^your_deployed_contract_address$/i.test(rawAddress)
    ? rawAddress
    : '';
  let contractAddress = configuredAddress || '';

  if (!contractAddress && artifact?.chainId === TARGET_CHAIN_ID) {
    contractAddress = artifact.address;
  } else if (!contractAddress && TARGET_CHAIN_ID === 11155111 && artifact?.chainId === 31337) {
    contractAddress = DOCUMENTED_SEPOLIA_CONTRACT;
  }

  if (contractAddress && !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    throw new Error('REACT_APP_CONTRACT_ADDRESS must be a valid Ethereum address.');
  }

  return contractAddress;
};
