/*
  Generate collaborative transaction for SLP tokens exchange
  Assuming addresses, balances, tokens etc. are already checked in step1
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'mainnet'

// REST API servers.
const MAINNET_API_FREE = 'https://free-main.fullstack.cash/v3/'
const TESTNET_API_FREE = 'https://free-test.fullstack.cash/v3/'
// const MAINNET_API_PAID = 'https://api.fullstack.cash/v3/'
// const TESTNET_API_PAID = 'https://tapi.fullstack.cash/v3/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js')

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === 'mainnet') bchjs = new BCHJS({ restURL: MAINNET_API_FREE })
else bchjs = new BCHJS({ restURL: TESTNET_API_FREE })

const AppUtils = require('./util')
const appUtils = new AppUtils()

// Open the offering part wallet generated with create-wallets.
try {
  var walletInfo = require('../create-wallets/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

// Open the accepting part wallet generated with create-wallets.
try {
  var walletInfo1 = require('../create-wallets/wallet-1.json')
} catch (err) {
  console.log(
    'Could not open wallet-1.json. Generate wallets with create-wallets first.'
  )
  process.exit(0)
}

const offerAddr = walletInfo.cashAddress
const acceptAddr = walletInfo1.cashAddress

const offerWif = walletInfo.WIF
const acceptWif = walletInfo1.WIF

const offerECPair = bchjs.ECPair.fromWIF(offerWif)
const acceptECPair = bchjs.ECPair.fromWIF(acceptWif)

const offerSLP = bchjs.SLP.Address.toSLPAddress(offerAddr)
const acceptSLP = bchjs.SLP.Address.toSLPAddress(acceptAddr)

// Open the sell signal information generated with step1-generate-signal.js
// TODO: get this information from blockchain
try {
  var offerMeta = require('./signal.json')
} catch (err) {
  console.log(
    'Could not open signal.json. Generate signal information with step1-generate-signal.js first.'
  )
  process.exit(0)
}
// console.log(`signal meta: ${JSON.stringify(offerMeta, null, 2)}`)

async function generateColaborativeTx () {
  try {
    // UTXO with  all token information included - TxId from the signal
    const offeredTx = await appUtils.getUtxoDetails(offerAddr, offerMeta.exactUtxoTxId)
    // console.log(`offered Tx: ${JSON.stringify(offeredTx, null, 2)}`)

    // All UTXO for address
    const utxos = await bchjs.Electrumx.utxo(offerAddr)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)
    if (!utxos.success) throw new Error(`Could not get UTXOs for address ${offerAddr}`)

    // BCH UTXO to pay for the exchange
    const bchUtxo = await appUtils.findBiggestUtxo(utxos.utxos)
    // console.log(`bch utxo: ${JSON.stringify(bchUtxo, null, 2)}`)

    // Only UTXO with the token for exchange
    const tokenUtxos = await appUtils.getTokenUtxos(offerAddr, offeredTx.tokenId)
    // console.log(`token utxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

    // TODO: move this to Bob part
    const buyNeedSats = offeredTx.tokenQty * offerMeta.rate
    console.log(`Exchange: ${buyNeedSats} satoshis for ${offeredTx.tokenQty} ${offeredTx.tokenTicker}`)

    // Build First part of the collaborative Tx a.k.a. Alice
    // ------------------------------------------------------
    // Input: UTXOs with tokens for exchange
    // Output: send SLP token Tx
    // Generate the OP_RETURN code.
    const slpSendObj = bchjs.SLP.TokenType1.generateSendOpReturn(
      tokenUtxos,
      offeredTx.tokenQty
    )
    const slpData = slpSendObj.script
    console.log(`slpOutputs: ${slpSendObj.outputs}`)

    // Construct Tx
    // instance of transaction builder
    let transactionBuilder
    if (NETWORK === 'mainnet') {
      transactionBuilder = new bchjs.TransactionBuilder()
    } else transactionBuilder = new bchjs.TransactionBuilder('testnet')

    const originalAmount = bchUtxo.value
    console.log(`original amount: ${originalAmount}`)
    transactionBuilder.addInput(bchUtxo.tx_hash, bchUtxo.tx_pos)

    // add each token UTXO as an input.
    for (let i = 0; i < tokenUtxos.length; i++) {
      transactionBuilder.addInput(tokenUtxos[i].tx_hash, tokenUtxos[i].tx_pos)
    }

    // Note: This may not be totally accurate. Just guessing on the byteCount size.
    const txFee = 250

    // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - txFee - 546 * 2
    if (remainder < 1) {
      throw new Error('Selected UTXO does not have enough satoshis')
    }
    console.log(`remainder: ${remainder}`)

    transactionBuilder.addOutput(slpData, 0)

    // Send dust transaction representing tokens being sent.
    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(acceptSLP),
      546
    )

    // TODO: send remaining tokens back to offering part
    //       for now will send ALL tokens in the UTXOs
    if (slpSendObj.outputs > 1) {
      console.log('WARNING: choose one UTXO with all tokens to exchange')
      /* transactionBuilder.addOutput(
        bchjs.SLP.Address.toLegacyAddress(offerSLP),
        546
      ) */
    }

    // Last output: send the BCH change back to the wallet.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(offerAddr),
      remainder
    )

    // Sign the transaction with the private key for the BCH UTXO paying the fees.
    let redeemScript
    transactionBuilder.sign(
      0,
      offerECPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // Sign each token UTXO being consumed.
    for (let i = 0; i < tokenUtxos.length; i++) {
      const thisUtxo = tokenUtxos[i]

      transactionBuilder.sign(
        1 + i,
        offerECPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        thisUtxo.value
      )
    }

    const tx = transactionBuilder.build()
    console.log(`tx: ${JSON.stringify(tx, null, 2)}`)
    const hex = tx.toHex()
    console.log(`Transaction raw hex: ${hex}`)
  } catch (err) {
    console.error('Error in generateColaborativeTx: ', err)
    throw err
  }
}
generateColaborativeTx()
