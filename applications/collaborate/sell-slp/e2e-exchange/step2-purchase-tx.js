/*
  Generate payment part of collaborative transaction for SLP tokens exchange
  Assuming addresses, balances, tokens etc. are already checked in step1
*/

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
// const ABC_MAINNET = 'https://abc.fullstack.cash/v3/'
// const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

const AppUtils = require('./util')
const appUtils = new AppUtils()

const fs = require('fs')

// Open the Seller's wallet generated with create-wallets.
try {
  var sellerWallet = require('../create-wallets/seller-wallet.json')
} catch (err) {
  console.log(
    'Could not open seller-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the Buyer's wallet generated with create-wallets.
try {
  var buyerWallet = require('../create-wallets/buyer-wallet.json')
} catch (err) {
  console.log(
    'Could not open buyer-wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const sellerAddr = sellerWallet.cashAddress

const buyerAddr = buyerWallet.cashAddress
const buyerWif = buyerWallet.WIF
const buyerECPair = bchjs.ECPair.fromWIF(buyerWif)
const buyerSLP = bchjs.SLP.Address.toSLPAddress(buyerAddr)

// Open the sell signal information generated with step1-generate-signal.js
try {
  var offerMeta = require('./signal.json')
} catch (err) {
  console.log(
    'Could not open signal.json. Generate signal information with step1-generate-signal.js first.'
  )
  process.exit(0)
}

// Buyer generates a partially signed transaction to accept the offer from the
// Seller.
async function generatePurchaseTx (signal) {
  try {
    // console.log(`signal meta: ${JSON.stringify(signal, null, 2)}`)
    console.log(`buyer:\naddr = ${buyerAddr}\nslp = ${buyerSLP}`)

    // UTXO with  all token information included - TxId from the signal
    const offeredUTXO = await appUtils.getUtxoDetails(
      sellerAddr,
      signal.exactUtxoTxId
    )
    // console.log(`offered UTXO: ${JSON.stringify(offeredUTXO, null, 2)}`)

    console.log(
      `\npay for:\ntokenId = ${offeredUTXO.tokenId} (${
        offeredUTXO.tokenTicker
      })`
    )
    console.log(`amount = ${offeredUTXO.tokenQty}`)
    console.log(`per token = ${signal.rate} satoshis`)
    console.log(`total = ${signal.rate * offeredUTXO.tokenQty} satoshis`)

    // All UTXO for address
    const utxos = await bchjs.Electrumx.utxo(buyerAddr)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)
    if (!utxos.success) {
      throw new Error(`Could not get UTXOs for address ${buyerAddr}`)
    }

    // --------[ Construct Purchase Tx ]--------

    // instance of transaction builder
    const transactionBuilder = new bchjs.TransactionBuilder()

    // BCH UTXO to pay for the exchange
    const paymentUtxo = await appUtils.findBiggestUtxo(utxos.utxos)
    // console.log(`payment UTXO: ${JSON.stringify(paymentUtxo, null, 2)}`)

    // Build First part of the collaborative Tx a.k.a. Alice
    // Generate the OP_RETURN code.
    const slpSendObj = bchjs.SLP.TokenType1.generateSendOpReturn(
      [offeredUTXO],
      offeredUTXO.tokenQty
    )
    const slpData = slpSendObj.script
    // console.log(`slpOutputs: ${slpSendObj.outputs}`)

    // This example only supports a single SLP token UTXO for exact token quantities
    // (no token change). e.g. 1 UTXO representing 0.01 tokens.
    if (slpSendObj.outputs > 1) {
      console.log('WARNING: choose one UTXO with all tokens to exchange')
      return
    }

    // Calculate sats needed to pay the offer.
    const satsRequiredToBuy = offeredUTXO.tokenQty * signal.rate

    // Calculate miner fees.
    // Get byte count (minimum 2 inputs, 3 outputs)
    const opReturnBufLength = slpData.byteLength + 32 // add padding
    const byteCount =
      bchjs.BitcoinCash.getByteCount({ P2PKH: 2 }, { P2PKH: 4 }) +
      opReturnBufLength
    const satsNeeded = byteCount + satsRequiredToBuy
    // console.log(`satoshis needed: ${satsNeeded}`)

    // add UTXO for sell(STILL CANNOT SPEND - not signed yet)
    transactionBuilder.addInput(offeredUTXO.tx_hash, offeredUTXO.tx_pos)

    // add payment UTXO
    transactionBuilder.addInput(paymentUtxo.tx_hash, paymentUtxo.tx_pos)

    // Add the SLP OP_RETURN data as the first output.
    transactionBuilder.addOutput(slpData, 0)

    const originalAmount = paymentUtxo.value
    // console.log(`original amount: ${originalAmount}`)
    const dust = 546

    // Send dust transaction representing tokens being sent.
    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(buyerSLP),
      dust
    )

    const remainder = originalAmount - satsNeeded - dust // exchange fee + token UTXO dust
    if (remainder < 1) {
      throw new Error('Selected UTXO does not have enough satoshis')
    }
    // console.log(`remainder: ${remainder}`)

    // Send payment to the offer side
    transactionBuilder.addOutput(sellerAddr, satsRequiredToBuy)

    // Send the BCH change back to the payment part
    transactionBuilder.addOutput(buyerAddr, remainder)

    // Sign the payment transaction
    transactionBuilder.sign(
      1,
      buyerECPair,
      null,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    const tx = transactionBuilder.transaction.buildIncomplete()

    const hex = tx.toHex()
    // console.log(`Half-signed Tx hex: ${hex}`)
    fs.writeFileSync('payment.json', JSON.stringify(hex, null, 2))
    console.log('\npayment.json written successfully.')
    console.log('Next, run: npm run step3')
  } catch (err) {
    console.error(`Error in generatePaymentTx(): ${err}`)
    throw err
  }
}
generatePurchaseTx(offerMeta)
