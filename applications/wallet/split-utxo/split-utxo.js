/*
  Split the largest UTXO held by the wallet into 5 equally sized UTXOs.
  Useful for avoiding slow indexers and utxo-chain limits.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = 'testnet'

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

// Open the wallet generated with create-wallet.
try {
  var walletInfo = require('../create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}

const SEND_ADDR = walletInfo.cashAddress
const SEND_MNEMONIC = walletInfo.mnemonic

async function splitUtxo () {
  try {
    // Get the balance of the sending address.
    const balance = await getBCHBalance(SEND_ADDR, false)

    // Exit if the balance is zero.
    if (balance <= 0.0) {
      console.log('Balance of sending address is zero. Exiting.')
      process.exit(0)
    }

    // Send the BCH back to the same wallet address.
    const RECV_ADDR = SEND_ADDR

    // Convert to a legacy address (needed to build transactions).
    // const SEND_ADDR_LEGACY = bchjs.Address.toLegacyAddress(SEND_ADDR)
    // const RECV_ADDR_LEGACY = bchjs.Address.toLegacyAddress(RECV_ADDR)

    // Get UTXOs held by the address.
    // https://developer.bitcoin.com/mastering-bitcoin-cash/4-transactions/
    const data = await bchjs.Electrumx.utxo(SEND_ADDR)
    const utxos = data.utxos
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    if (utxos.length === 0) throw new Error('No UTXOs found.')

    // console.log(`u: ${JSON.stringify(u, null, 2)}`
    const utxo = await findBiggestUtxo(utxos)
    console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    let transactionBuilder
    if (NETWORK === 'mainnet') {
      transactionBuilder = new bchjs.TransactionBuilder()
    } else transactionBuilder = new bchjs.TransactionBuilder('testnet')

    // Essential variables of a transaction.
    const originalAmount = utxo.value
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = bchjs.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 5 })
    console.log(`Transaction byte count: ${byteCount}`)
    const satoshisPerByte = 1.2
    const txFee = Math.floor(satoshisPerByte * byteCount)
    console.log(`Transaction fee: ${txFee}`)

    // Calculate the amount to put into each new UTXO.
    const satoshisToSend = Math.floor((originalAmount - txFee) / 5)

    if (satoshisToSend < 546) { throw new Error('Not enough BCH to complete transaction!') }

    // add outputs w/ address and amount to send
    for (let i = 0; i < 5; i++) {
      transactionBuilder.addOutput(RECV_ADDR, satoshisToSend)
    }

    // Generate a change address from a Mnemonic of a private key.
    const change = await changeAddrFromMnemonic(SEND_MNEMONIC)

    // Generate a keypair from the change address.
    const keyPair = bchjs.HDNode.toKeyPair(change)

    // Sign the transaction with the HD node.
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // build tx
    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()
    // console.log(`TX hex: ${hex}`)
    console.log(' ')

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])

    // import from util.js file
    const util = require('../util.js')
    console.log(`Transaction ID: ${txidStr}`)
    console.log('Check the status of your transaction on this block explorer:')
    util.transactionStatus(txidStr, NETWORK)
  } catch (err) {
    console.log('error: ', err)
  }
}
splitUtxo()

// Generate a change address from a Mnemonic of a private key.
async function changeAddrFromMnemonic (mnemonic) {
  // root seed buffer
  const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)

  // master HDNode
  let masterHDNode
  if (NETWORK === 'mainnet') masterHDNode = bchjs.HDNode.fromSeed(rootSeed)
  else masterHDNode = bchjs.HDNode.fromSeed(rootSeed, 'testnet')

  // HDNode of BIP44 account
  const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

  // derive the first external change address HDNode which is going to spend utxo
  const change = bchjs.HDNode.derivePath(account, '0/0')

  return change
}

// Get the balance in BCH of a BCH address.
async function getBCHBalance (addr, verbose) {
  try {
    const result = await bchjs.Electrumx.balance(addr)

    if (verbose) console.log(result)

    // The total balance is the sum of the confirmed and unconfirmed balances.
    const satBalance =
      Number(result.balance.confirmed) + Number(result.balance.unconfirmed)

    // Convert the satoshi balance to a BCH balance
    const bchBalance = bchjs.BitcoinCash.toBitcoinCash(satBalance)

    return bchBalance
  } catch (err) {
    console.error('Error in getBCHBalance: ', err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
async function findBiggestUtxo (utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]
    // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);

    // Validate the UTXO data with the full node.
    const txout = await bchjs.Blockchain.getTxOut(thisUtxo.tx_hash, thisUtxo.tx_pos)
    if (txout === null) {
      // If the UTXO has already been spent, the full node will respond with null.
      console.log(
        'Stale UTXO found. You may need to wait for the indexer to catch up.'
      )
      continue
    }

    if (thisUtxo.value > largestAmount) {
      largestAmount = thisUtxo.value
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
