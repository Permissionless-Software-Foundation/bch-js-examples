/*
  Sign own inputs from the combined tx
*/

const Bitcoin = require('bitcoincashjs-lib')

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

const fs = require('fs')

// Open Alice's wallet generated with create-wallets.
try {
  var aliceWallet = require('../create-wallets/alice-wallet.json')
} catch (err) {
  console.log(
    'Could not open alice-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open Bob's wallet generated with create-wallets.
try {
  var bobWallet = require('../create-wallets/bob-wallet.json')
} catch (err) {
  console.log(
    'Could not open bob-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open Sam's wallet generated with create-wallets.
try {
  var samWallet = require('../create-wallets/sam-wallet.json')
} catch (err) {
  console.log(
    'Could not open sam-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const aliceAddr = aliceWallet.cashAddress
const bobAddr = bobWallet.cashAddress
const samAddr = samWallet.cashAddress

const aliceWIF = aliceWallet.WIF
const bobWIF = bobWallet.WIF
const samWIF = samWallet.WIF

// Open the combined inputs information generated with step1-combine-inputs.js
try {
  var combinedInputs = require('./combined_inputs.json')
} catch (err) {
  console.log(
    'Could not open combined_inputs.json. Generate inputs information with step1-combine-inputs.js first.'
  )
  process.exit(0)
}

// Open the unsigned tx information generated with step2-unsigned-tx.js
try {
  var unsignedTx = require('./unsigned_tx.json')
} catch (err) {
  console.log(
    'Could not open unsigned_tx.json. Generate tx information with step2-unsigned-tx.js first.'
  )
  process.exit(0)
}

// find private key for BCH address
// Needed only for this example. In real life user will use his own WIF
function wifForAddress (address) {
  if (address === aliceAddr) return aliceWIF
  if (address === bobAddr) return bobWIF
  if (address === samAddr) return samWIF
  throw new Error('No WIF found.')
}

// find utxo tx_hash for particular address
// Needed only for this example. In real life user will know his own UTXO
function utxoForAddress (address) {
  try {
    const inputs = combinedInputs.filter(function (account) {
      if (account.address === address) return true
      return false
    })
    // one UTXO payment
    if (!inputs || inputs.length === 0) throw new Error('No User Inputs found.')

    return inputs[0].utxo
  } catch (err) {
    console.log(`Error in txIdForAddress(): ${err}`)
    throw err
  }
}

// Find inputs belonging to particular address (the ones can be signed)
function inputForAddress (address, allInputs) {
  try {
    const addressUTXO = utxoForAddress(address)
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i]
      const txId = Buffer.from(input.hash).reverse().toString('hex')
      if (txId === addressUTXO.tx_hash) return i
    }
    throw new Error(`No inputs for address ${address}`)
  } catch (err) {
    console.log(`Error in paymentTxForAddress(): ${err}`)
    throw err
  }
}

// Everybody sign their out input UTXO
async function signOwnInput () {
  try {
    // console.log(`Tx: ${JSON.stringify(unsignedTx, null, 2)}`)
    // Convert the hex string version of the transaction into a Buffer.
    const paymentFileBuffer = Buffer.from(unsignedTx, 'hex')

    const allAddresses = [aliceAddr, bobAddr, samAddr]

    // Simulate signing own inputs for every individual address
    allAddresses.forEach(function (address) {
      const wif = wifForAddress(address)
      const ecPair = bchjs.ECPair.fromWIF(wif)

      // Generate a Transaction object from the transaction binary data.
      const csTransaction = Bitcoin.Transaction.fromBuffer(paymentFileBuffer)
      // console.log(`payments tx: ${JSON.stringify(csTransaction, null, 2)}`)

      // Instantiate the Transaction Builder.
      const csTransactionBuilder = Bitcoin.TransactionBuilder.fromTransaction(
        csTransaction,
        'mainnet'
      )
      // console.log(`builder: ${JSON.stringify(csTransactionBuilder, null, 2)}`)

      // find index of the input for that address
      const inputIdx = inputForAddress(address, csTransactionBuilder.tx.ins)

      // TODO: user should check also if his own Outputs presents
      // in csTransactionBuilder.tx.outs[]

      const addressUTXO = utxoForAddress(address)
      let redeemScript
      csTransactionBuilder.sign(
        inputIdx,
        ecPair,
        redeemScript,
        Bitcoin.Transaction.SIGHASH_ALL,
        addressUTXO.value
      )
      // build tx
      const csTx = csTransactionBuilder.buildIncomplete()
      // output rawhex
      const csTxHex = csTx.toHex()
      // console.log(`Partially signed Tx hex: ${csTxHex}`)

      // 'Send' partialially signed Tx to the server
      fs.writeFileSync(`signed_tx_${inputIdx}.json`, JSON.stringify(csTxHex, null, 2))
    })

    console.log('signed txs for every user written successfully.')
  } catch (err) {
    console.error(`Error in signOwnInput(): ${err}`)
    throw err
  }
}
signOwnInput()
