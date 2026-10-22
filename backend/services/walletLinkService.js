const crypto = require('crypto');
const { ethers } = require('ethers');
const User = require('../models/User');

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

class WalletLinkError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'WalletLinkError';
    this.statusCode = statusCode;
  }
}

const normalizeAddress = (walletAddress) => {
  if (typeof walletAddress !== 'string' || !ethers.isAddress(walletAddress)) {
    throw new WalletLinkError('Invalid Ethereum wallet address');
  }
  return ethers.getAddress(walletAddress).toLowerCase();
};

const buildWalletLinkMessage = (userId, walletAddress, nonce, expiresAt) => [
  'Link this wallet to your MediChain account.',
  `Account: ${userId}`,
  `Wallet: ${walletAddress}`,
  `Nonce: ${nonce}`,
  `Expires: ${expiresAt.toISOString()}`,
].join('\n');

const findWalletOwner = (walletAddress, userId) => User.findOne({
  walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') },
  _id: { $ne: userId },
});

async function createWalletLinkChallenge(userId, submittedAddress) {
  const walletAddress = normalizeAddress(submittedAddress);
  if (await findWalletOwner(walletAddress, userId)) {
    throw new WalletLinkError('Wallet address already linked to another account', 409);
  }

  const nonce = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const updatedUser = await User.findByIdAndUpdate(userId, {
    $set: {
      walletLinkAddress: walletAddress,
      walletLinkNonce: nonce,
      walletLinkExpires: expiresAt,
    },
  }, { new: true });

  if (!updatedUser) {
    throw new WalletLinkError('Account not found', 404);
  }

  return {
    walletAddress,
    nonce,
    expiresAt,
    message: buildWalletLinkMessage(userId, walletAddress, nonce, expiresAt),
  };
}

async function linkWalletWithSignature(userId, { walletAddress: submittedAddress, nonce, signature }) {
  const walletAddress = normalizeAddress(submittedAddress);
  if (typeof nonce !== 'string' || typeof signature !== 'string' || !signature) {
    throw new WalletLinkError('A wallet-link nonce and signature are required');
  }

  const user = await User.findById(userId)
    .select('+walletLinkAddress +walletLinkNonce +walletLinkExpires');
  if (!user) {
    throw new WalletLinkError('Account not found', 404);
  }

  if (
    !user.walletLinkNonce ||
    user.walletLinkNonce !== nonce ||
    user.walletLinkAddress !== walletAddress ||
    !user.walletLinkExpires ||
    user.walletLinkExpires <= new Date()
  ) {
    throw new WalletLinkError('Wallet-link challenge is invalid or expired', 400);
  }

  const message = buildWalletLinkMessage(
    userId,
    user.walletLinkAddress,
    user.walletLinkNonce,
    user.walletLinkExpires
  );

  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch {
    throw new WalletLinkError('Wallet signature is invalid', 400);
  }

  if (recoveredAddress.toLowerCase() !== walletAddress) {
    throw new WalletLinkError('Wallet signature does not match the requested address', 403);
  }

  if (await findWalletOwner(walletAddress, userId)) {
    throw new WalletLinkError('Wallet address already linked to another account', 409);
  }

  const updatedUser = await User.findOneAndUpdate({
    _id: userId,
    walletLinkAddress: walletAddress,
    walletLinkNonce: nonce,
    walletLinkExpires: { $gt: new Date() },
  }, {
    $set: {
      walletAddress,
      isWalletLinked: true,
      walletVerified: true,
    },
    $unset: {
      walletLinkAddress: 1,
      walletLinkNonce: 1,
      walletLinkExpires: 1,
    },
  }, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new WalletLinkError('Wallet-link challenge has already been used or expired', 400);
  }

  return updatedUser;
}

module.exports = {
  WalletLinkError,
  createWalletLinkChallenge,
  linkWalletWithSignature,
};
