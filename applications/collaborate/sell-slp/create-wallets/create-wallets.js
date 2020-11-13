/*
  Create an HDNode wallet using bch-js. The mnemonic from this wallet
  will be used by later examples.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: BCHN_MAINNET })
else bchjs = new BCHJS({ restURL: BCHN_MAINNET })

const fs = require('fs')

const lang = 'english' // Set the language of the wallet.

async function createWallets () {
  try {
    // create 256 bit BIP39 mnemonic
    const sellerMnemonic = bchjs.Mnemonic.generate(
      128,
      bchjs.Mnemonic.wordLists()[lang]
    )
    const buyerMnemonic = bchjs.Mnemonic.generate(
      128,
      bchjs.Mnemonic.wordLists()[lang]
    )

    // root seed buffer
    const sellerRootSeed = await bchjs.Mnemonic.toSeed(sellerMnemonic)
    const buyerRootSeed = await bchjs.Mnemonic.toSeed(buyerMnemonic)

    // master HDNode
    const sellerMasterHDNode = bchjs.HDNode.fromSeed(sellerRootSeed)
    const buyerMasterHDNode = bchjs.HDNode.fromSeed(buyerRootSeed)

    // Use 245 derivation path, which is the BIP44 standard for SLP tokens.
    const sellerChildNode = sellerMasterHDNode.derivePath("m/44'/245'/0'/0/0")
    const buyerChildNode = buyerMasterHDNode.derivePath("m/44'/245'/0'/0/0")

    const sellerObj = {}
    sellerObj.mnemonic = sellerMnemonic
    sellerObj.cashAddress = bchjs.HDNode.toCashAddress(sellerChildNode)
    sellerObj.legacyAddress = bchjs.HDNode.toLegacyAddress(sellerChildNode)
    sellerObj.slpAddress = bchjs.SLP.HDNode.toSLPAddress(sellerChildNode)
    sellerObj.WIF = bchjs.HDNode.toWIF(sellerChildNode)

    const buyerObj = {}
    buyerObj.mnemonic = buyerMnemonic
    buyerObj.cashAddress = bchjs.HDNode.toCashAddress(buyerChildNode)
    buyerObj.legacyAddress = bchjs.HDNode.toLegacyAddress(buyerChildNode)
    buyerObj.slpAddress = bchjs.SLP.HDNode.toSLPAddress(buyerChildNode)
    buyerObj.WIF = bchjs.HDNode.toWIF(buyerChildNode)

    // Write out the basic information into a json file for other example apps to use.
    fs.writeFileSync('seller-wallet.json', JSON.stringify(sellerObj, null, 2))
    fs.writeFileSync('buyer-wallet.json', JSON.stringify(buyerObj, null, 2))

    console.log(`
      Wallets created. To continue the example, you need to fund these wallets.

      Send 3000 sats to the Sellers address:
      ${sellerObj.cashAddress}

      Send 3000 sats to the Buyers address:
      ${buyerObj.cashAddress}

      Also send 0.01 PSF tokens to the Sellers address:
      ${sellerObj.slpAddress}

      You can buy PSF tokens at https://PSFoundation.cash
      `)
  } catch (err) {
    console.error('Error in createWallet(): ', err)
  }
}
createWallets()
