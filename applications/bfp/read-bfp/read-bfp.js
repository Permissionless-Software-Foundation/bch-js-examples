/*
  Write arbitrary JSON data to the blockchain using Bitcoin Files Protocol.
*/

const util = require('util')

// Set NETWORK to either testnet or mainnet
const NETWORK = "mainnet";

// Use a bitcoinfiles: hash
const bfpHash =
  "bitcoinfile:7e68134928a116aa64f1de9695cf18156db343f745baddfdabb90b66c87436e0";

// REST API servers.
const MAINNET_API = "https://api.fullstack.cash/v3/";
const TESTNET_API = "https://tapi.fullstack.cash/v3/";

// bch-js-examples require code from the main bch-js repo
const BCHJS = require("@chris.troutner/bch-js");

// Instantiate bch-js based on the network.
let bchjs;
if (NETWORK === "mainnet") bchjs = new BCHJS({ restURL: MAINNET_API });
else bchjs = new BCHJS({ restURL: TESTNET_API });

const Bfp = require("bitcoinfiles-node").bfp;

let bfp;
if (NETWORK === "mainnet")
  bfp = new Bfp(bchjs, "mainnet", "https://bchd.greyh.at:8335");
else bfp = new Bfp(bchjs, "testnet");

// Open the wallet generated with create-wallet.
try {
  var walletInfo = require("../../wallet/create-wallet/wallet.json");
} catch (err) {
  console.log(
    "Could not open wallet.json. Generate a wallet with create-wallet first."
  );
  process.exit(0);
}

const SEND_ADDR = walletInfo.cashAddress;
const SEND_MNEMONIC = walletInfo.mnemonic;

async function readBFP() {
  try {
    // Download the raw data in binary form.
    const rawData = await bfp.downloadFile(bfpHash);

    // Convert the Buffer to a string.
    const strData = rawData.fileBuf.toString();

    // Parse the string into a JSON Object.
    const jsonObj = JSON.parse(strData)
    console.log(`Original JSON object: ${JSON.stringify(jsonObj,null,2)}`)
  } catch (err) {
    console.error(err);
  }
}
readBFP();
