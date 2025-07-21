const { ethers } = require("ethers");
const path = require("path");
const { Module } = require("./utils/module");
const { isAlphabetic } = require("./utils/helperfunc");
require("dotenv").config();

const RPC_WS = process.env.RPC_WS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY_OR_SEEDPHRASE || "";

let wallet;
const provider = new ethers.WebSocketProvider(RPC_WS);

if (isAlphabetic(PRIVATE_KEY)) {
  wallet = new ethers.Wallet(
    ethers.Wallet.fromPhrase(PRIVATE_KEY).privateKey,
    provider
  );
} else {
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
}

const settings = {
  minPriceDiffPerc: Number(process.env.MIN_PRICE_DIF_PERC || "0.9"),
  wsRPC: RPC_WS,
  wallet: wallet,
  provider: provider,
};

// Instance of bot class
const bot = new Module(settings);

async function run() {
  // Initialize bot
  await bot.initialize();

  // Listen to new block event
  provider.on("block", async (blockNumber) => {
    console.log(blockNumber);
    const block = await provider.getBlock(blockNumber);
    if (block && block.transactions) {
      block.transactions.forEach((txhash) => {
        provider
          .getTransactionReceipt(txhash)
          .then((receipt) => {
            bot.processTxReciept(receipt);
          })
          .catch((err) => console.log(err));
      });
    }
  });
}

run();
