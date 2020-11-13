/*
  Create an HDNode wallet using bch-js. The mnemonic from this wallet
  will be used by later examples.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: BCHN_MAINNET })
else bchjs = new BCHJS({ restURL: TESTNET3 })

const fs = require('fs')

const lang = 'english' // Set the language of the wallet.

async function createWallets () {
  try {
    // create 256 bit BIP39 mnemonic
    const aliceMnemonic = bchjs.Mnemonic.generate(
      128,
      bchjs.Mnemonic.wordLists()[lang]
    )
    const bobMnemonic = bchjs.Mnemonic.generate(
      128,
      bchjs.Mnemonic.wordLists()[lang]
    )
    const samMnemonic = bchjs.Mnemonic.generate(
      128,
      bchjs.Mnemonic.wordLists()[lang]
    )

    // root seed buffer
    const aliceRootSeed = await bchjs.Mnemonic.toSeed(aliceMnemonic)
    const bobRootSeed = await bchjs.Mnemonic.toSeed(bobMnemonic)
    const samRootSeed = await bchjs.Mnemonic.toSeed(samMnemonic)

    // master HDNode
    const aliceMasterHDNode = bchjs.HDNode.fromSeed(aliceRootSeed)
    const bobMasterHDNode = bchjs.HDNode.fromSeed(bobRootSeed)
    const samMasterHDNode = bchjs.HDNode.fromSeed(samRootSeed)

    // Use 245 derivation path, which is the BIP44 standard for SLP tokens.
    const aliceChildNode = aliceMasterHDNode.derivePath("m/44'/145'/0'/0/0")
    const bobChildNode = bobMasterHDNode.derivePath("m/44'/145'/0'/0/0")
    const samChildNode = samMasterHDNode.derivePath("m/44'/145'/0'/0/0")

    const aliceObj = {}
    aliceObj.mnemonic = aliceMnemonic
    aliceObj.cashAddress = bchjs.HDNode.toCashAddress(aliceChildNode)
    aliceObj.legacyAddress = bchjs.HDNode.toLegacyAddress(aliceChildNode)
    aliceObj.slpAddress = bchjs.SLP.HDNode.toSLPAddress(aliceChildNode)
    aliceObj.WIF = bchjs.HDNode.toWIF(aliceChildNode)

    const bobObj = {}
    bobObj.mnemonic = bobMnemonic
    bobObj.cashAddress = bchjs.HDNode.toCashAddress(bobChildNode)
    bobObj.legacyAddress = bchjs.HDNode.toLegacyAddress(bobChildNode)
    bobObj.slpAddress = bchjs.SLP.HDNode.toSLPAddress(bobChildNode)
    bobObj.WIF = bchjs.HDNode.toWIF(bobChildNode)

    const samObj = {}
    samObj.mnemonic = samMnemonic
    samObj.cashAddress = bchjs.HDNode.toCashAddress(samChildNode)
    samObj.legacyAddress = bchjs.HDNode.toLegacyAddress(samChildNode)
    samObj.slpAddress = bchjs.SLP.HDNode.toSLPAddress(samChildNode)
    samObj.WIF = bchjs.HDNode.toWIF(samChildNode)

    // Write out the basic information into a json file for other example apps to use.
    fs.writeFileSync('alice-wallet.json', JSON.stringify(aliceObj, null, 2))
    fs.writeFileSync('bob-wallet.json', JSON.stringify(bobObj, null, 2))
    fs.writeFileSync('sam-wallet.json', JSON.stringify(samObj, null, 2))

    console.log(`
      Wallets created. To continue the example, you need to fund these wallets.

      Send 3000 sats to the Alice's address:
      ${aliceObj.cashAddress}

      Send 3000 sats to the Bob's address:
      ${bobObj.cashAddress}

      Send 3000 sats to the Sam's address:
      ${samObj.cashAddress}
      `)
  } catch (err) {
    console.error('Error in createWallets(): ', err)
  }
}
createWallets()
