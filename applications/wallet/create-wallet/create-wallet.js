/*
  Create an HDNode wallet using bch-js. The mnemonic from this wallet
  will be used in future examples.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = `mainnet`

// REST API servers.
const MAINNET_API = `https://mainnet.bchjs.cash/v3/`
const TESTNET_API = `http://testnet.bchjs.cash/v3/`

const BCHJS = require("../../../../src/bch-js")

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === `mainnet`) bchjs = new BCHJS({ restURL: MAINNET_API })
else bchjs = new BCHJS({ restURL: TESTNET_API })

const fs = require("fs")

const lang = "english" // Set the language of the wallet.

// These objects used for writing wallet information out to a file.
let outStr = ""
const outObj = {}

async function createWallet() {
  try {
    // create 256 bit BIP39 mnemonic
    const mnemonic = bchjs.Mnemonic.generate(
      128,
      bchjs.Mnemonic.wordLists()[lang]
    )
    console.log("BIP44 $BCH Wallet")
    outStr += "BIP44 $BCH Wallet\n"
    console.log(`128 bit ${lang} BIP39 Mnemonic: `, mnemonic)
    outStr += `\n128 bit ${lang} BIP32 Mnemonic:\n${mnemonic}\n\n`
    outObj.mnemonic = mnemonic

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    console.log(`rootSeed: ${rootSeed}`)

    // master HDNode
    let masterHDNode
    if (NETWORK === `mainnet`) masterHDNode = bchjs.HDNode.fromSeed(rootSeed)
    else masterHDNode = bchjs.HDNode.fromSeed(rootSeed, "testnet") // Testnet

    // HDNode of BIP44 account
    console.log(`BIP44 Account: "m/44'/145'/0'"`)
    outStr += `BIP44 Account: "m/44'/145'/0'"\n`

    // Generate the first 10 seed addresses.
    for (let i = 0; i < 10; i++) {
      const childNode = masterHDNode.derivePath(`m/44'/145'/0'/0/${i}`)
      console.log(
        `m/44'/145'/0'/0/${i}: ${bchjs.HDNode.toCashAddress(childNode)}`
      )
      outStr += `m/44'/145'/0'/0/${i}: ${bchjs.HDNode.toCashAddress(
        childNode
      )}\n`

      // Save the first seed address for use in the .json output file.
      if (i === 0) {
        outObj.cashAddress = bchjs.HDNode.toCashAddress(childNode)
        outObj.legacyAddress = bchjs.HDNode.toLegacyAddress(childNode)
        outObj.WIF = bchjs.HDNode.toWIF(childNode)
      }
    }

    // Write the extended wallet information into a text file.
    fs.writeFile("wallet-info.txt", outStr, function(err) {
      if (err) return console.error(err)

      console.log(`wallet-info.txt written successfully.`)
    })

    // Write out the basic information into a json file for other example apps to use.
    fs.writeFile("wallet.json", JSON.stringify(outObj, null, 2), function(err) {
      if (err) return console.error(err)
      console.log(`wallet.json written successfully.`)
    })
  } catch (err) {
    console.error(`Error in createWallet(): `, err)
  }
}
createWallet()
