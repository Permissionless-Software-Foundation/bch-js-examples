/*
  Scan the addresses controlled by an HD wallet and sweep all the funds into
  the first address controlled by the wallet.

  This app is controlled by the constants at the top. Modify these for your own
  needs.

  Scope: Some apps make use of the HD wallet by storing BCH on other addresses
  controlled by the HD wallet. This example is handy for sweeping the funds
  back into the root address (HD index 0). This is typically needed when cleaning
  up tests and prototypes during development.
*/

// Modify these constants for your own needs.
const NUM_ADDR_TO_SCAN = 20

// Public npm libraries
const BchWallet = require('minimal-slp-wallet/index')

// Open the wallet generated with create-wallet.
let walletInfo
try {
  walletInfo = require('../create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}

async function sweepWallet () {
  try {
    // Open the wallet with minimal-slp-wallet
    const mnemonic = walletInfo.mnemonic
    const wallet = new BchWallet(mnemonic, {
      // Use the web 3 interface
      interface: 'consumer-api'
    })
    await wallet.walletInfoPromise

    const bchjs = wallet.bchjs

    // Generate an array WIF private keys from the HD wallet.
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(rootSeed)
    const wifs = [] // Holds private keys
    let rootAddr = '' // Holds the index=0 BCH address
    for (let i = 0; i < NUM_ADDR_TO_SCAN; i++) {
      const childNode = masterHDNode.derivePath(`m/44'/245'/0'/0/${i}`)

      if (i === 0) {
        rootAddr = bchjs.HDNode.toCashAddress(childNode)
      } else {
        const wif = bchjs.HDNode.toWIF(childNode)
        wifs.push(wif)
      }
    }
    console.log('root address: ', rootAddr)
    console.log('private keys: ', wifs)
    console.log('Sweeping funds from each private key into the root address...')

    // Sweep the funds from each WIF into the root address.
    for (let i = 0; i < wifs.length; i++) {
      const thisWif = wifs[i]

      // Instantiate a new wallet using the WIF
      const tempWallet = new BchWallet(thisWif, { interface: 'consumer-api' })
      await tempWallet.walletInfoPromise

      // Skip if there is no BCH in this address.
      if (tempWallet.utxos.utxoStore.bchUtxos.length === 0) continue

      const txid = await tempWallet.sendAll(rootAddr)
      console.log(`Swept funds from ${tempWallet.walletInfo.cashAddress} using WIF ${thisWif} to root address ${rootAddr}. TXID: ${txid}`)
    }
  } catch (err) {
    console.error('Error in sweepWallet(): ', err)
  }
}
sweepWallet()
