/*
  Create a new NFT Child SLP token. Requires:
  - a wallet created with the create-wallet example.
  - wallet to have a small BCH balance.
  - At least one NFT Group token needs to have been created with the
    create-nft-group example.
*/

// EDIT THESE VALUES FOR YOUR USE.
const TOKENID =
  "eee4b82e4bb7113eca433829144363fc45f110693c286494fbf5b5c8043cc981";
const TOKENQTY = 1; // The quantity of new tokens to mint.
let TO_SLPADDR = ""; // The address to send the new tokens.

// Set NETWORK to either testnet or mainnet
const NETWORK = "mainnet";

// REST API servers.
const MAINNET_API = "https://api.fullstack.cash/v3/";
const TESTNET_API = "http://tapi.fullstack.cash/v3/";

// bch-js-examples require code from the main bch-js repo
const BCHJS = require("@chris.troutner/bch-js");

// Instantiate bch-js based on the network.
let bchjs;
if (NETWORK === "mainnet") bchjs = new BCHJS({ restURL: MAINNET_API });
else bchjs = new BCHJS({ restURL: TESTNET_API });

// Open the wallet generated with create-wallet.
let walletInfo;
try {
  walletInfo = require("../../create-wallet/wallet.json");
} catch (err) {
  console.log(
    "Could not open wallet.json. Generate a wallet with create-wallet first."
  );
  process.exit(0);
}

async function createNFTChild() {
  try {
    const mnemonic = walletInfo.mnemonic;

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic);
    // master HDNode
    let masterHDNode;
    if (NETWORK === "mainnet") masterHDNode = bchjs.HDNode.fromSeed(rootSeed);
    else masterHDNode = bchjs.HDNode.fromSeed(rootSeed, "testnet"); // Testnet

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'");

    const change = bchjs.HDNode.derivePath(account, "0/0");

    // ge-childt the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change);
    // const slpAddress = bchjs.SLP.Address.toSLPAddress(cashAddress)

    // Get a UTXO to pay for the transaction.
    const utxos = await bchjs.Blockbook.utxo(cashAddress);
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    if (utxos.length === 0) {
      throw new Error("No UTXOs to pay for transaction! Exiting.");
    }

    // Identify the SLP token UTXOs.
    let tokenUtxos = await bchjs.SLP.Utils.tokenUtxoDetails(utxos);
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

    // Filter out the non-SLP token UTXOs.
    const bchUtxos = utxos.filter((utxo, index) => {
      const tokenUtxo = tokenUtxos[index];
      if (!tokenUtxo) return true;
    });
    // console.log(`bchUTXOs: ${JSON.stringify(bchUtxos, null, 2)}`);

    if (bchUtxos.length === 0) {
      throw new Error("Wallet does not have a BCH UTXO to pay miner fees.");
    }

    // Filter out the token UTXOs that match the user-provided token ID
    // and contain the minting baton.
    tokenUtxos = tokenUtxos.filter((utxo, index) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === TOKENID && // UTXO matches the token ID.
        utxo.utxoType === "token" // UTXO is not a minting baton.
      )
        return true;
    });
    // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`);

    if (tokenUtxos.length === 0) {
      throw new Error("No token UTXOs for the specified token could be found.");
    }

    // Get the biggest UTXO to pay for the transaction.
    const utxo = findBiggestUtxo(utxos);
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    let transactionBuilder;
    if (NETWORK === "mainnet") {
      transactionBuilder = new bchjs.TransactionBuilder();
    } else transactionBuilder = new bchjs.TransactionBuilder("testnet");

    // Convert Blockbook UTXOs to Insight format.
    if (utxo.value) utxo.satoshis = Number(utxo.value);

    const originalAmount = utxo.satoshis;
    const vout = utxo.vout;
    const txid = utxo.txid;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // add the NFT Group UTXO as an input. This NFT Group token must be burned
    // to create a Child NFT, as per the spec.
    transactionBuilder.addInput(tokenUtxos[0].txid, tokenUtxos[0].vout);

    // Set the transaction fee. Manually set for ease of example.
    const txFee = 550;

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - txFee;

    // Generate SLP config object
    const configObj = {
      name: "NFT Child",
      ticker: "NFTC",
      documentUrl: "https://FullStack.cash"
    };

    // Generate the OP_RETURN entry for an SLP GENESIS transaction.
    const script = bchjs.SLP.NFT1.generateNFTChildGenesisOpReturn(configObj);
    // const data = bchjs.Script.encode(script)
    // const data = compile(script)

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0);

    // Send dust transaction representing the tokens.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      546
    );

    // Send dust transaction representing minting baton.
    // transactionBuilder.addOutput(
    //   bchjs.Address.toLegacyAddress(cashAddress),
    //   546
    // );

    // add output to send BCH remainder of UTXO.
    transactionBuilder.addOutput(cashAddress, remainder);

    // Generate a keypair from the change address.
    const keyPair = bchjs.HDNode.toKeyPair(change);

    // Sign the input for the UTXO paying for the TX.
    let redeemScript;
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    );

    // Sign the Token UTXO for the NFT Group token that will be burned in this
    // transaction.
    transactionBuilder.sign(
      1,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      546
    );

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();
    // console.log(`TX hex: ${hex}`)
    // console.log(` `)

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex]);
    console.log("Check the status of your transaction on this block explorer:");
    if (NETWORK === "testnet") {
      console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`);
    } else console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`);
  } catch (err) {
    console.error("Error in createNFTChild: ", err);
  }
}
createNFTChild();

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos) {
  let largestAmount = 0;
  let largestIndex = 0;

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i];

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis;
      largestIndex = i;
    }
  }

  return utxos[largestIndex];
}
