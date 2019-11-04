/*
  Create a Non Fungible Token.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = `mainnet`

const SLPSDK = require("../../lib/SLP")

// Instantiate SLP based on the network.
let SLP
if (NETWORK === `mainnet`)
  SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` })

// Open the wallet generated with create-wallet.
let walletInfo
try {
  walletInfo = require(`../create-wallet/wallet.json`)
} catch (err) {
  console.log(
    `Could not open wallet.json. Generate a wallet with create-wallet first.`
  )
  process.exit(0)
}

async function createNFT() {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = SLP.Mnemonic.toSeed(mnemonic)
    // master HDNode
    let masterHDNode
    if (NETWORK === `mainnet`) masterHDNode = SLP.HDNode.fromSeed(rootSeed)
    else masterHDNode = SLP.HDNode.fromSeed(rootSeed, "testnet") // Testnet

    // HDNode of BIP44 account
    const account = SLP.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

    const change = SLP.HDNode.derivePath(account, "0/0")

    // get the SLP address
    const slpAddress = SLP.HDNode.toSLPAddress(change)

    const fundingAddress = slpAddress
    const fundingWif = SLP.HDNode.toWIF(change)
    const tokenReceiverAddress = slpAddress
    const batonReceiverAddress = null
    const bchChangeReceiverAddress = SLP.HDNode.toCashAddress(change)

    const decimals = 0
    const name = "Non Fungible Token"
    const symbol = "NFT"
    const documentUri = "documentUri"
    const documentHash =
      "1010101010101010101010101010101010101010101010101010101010101010"
    const initialTokenQty = 1

    const genesisTxId = await SLP.TokenType1.create({
      fundingAddress,
      fundingWif,
      tokenReceiverAddress,
      batonReceiverAddress,
      bchChangeReceiverAddress,
      decimals,
      name,
      symbol,
      documentUri,
      documentHash,
      initialTokenQty
    })
    console.log(`genesisTxID: ${genesisTxId}`)
    console.log(
      `The genesis TxID above is used to uniquely identify your new class of SLP token. Save it and keep it handy.`
    )
    console.log(` `)
    console.log(`View this transaction on the block explorer:`)
    if (NETWORK === `mainnet`)
      console.log(`https://explorer.bitcoin.com/bch/tx/${genesisTxId}`)
    else console.log(`https://explorer.bitcoin.com/tbch/tx/${genesisTxId}`)
  } catch (err) {
    console.error(`Error in createNFT: `, err)
    console.log(`Error message: ${err.message}`)
    throw err
  }
}
createNFT()
