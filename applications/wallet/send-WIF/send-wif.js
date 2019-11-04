/*
  Same as send-bch example, except this uses a WIF instead of a mnemonic to
  sign the transaction.
  Send 1000 satoshis to RECV_ADDR.
*/

// Set NETWORK to either testnet or mainnet
const NETWORK = `mainnet`

// Replace the address below with the address you want to send the BCH to.
const RECV_ADDR = `bitcoincash:qzqlrn6zcfgtyyf8pkd2gmnl6acm7rnyjse7jqxnaa`
const SATOSHIS_TO_SEND = 1000

// REST API servers.
const MAINNET_API = `https://mainnet.bchjs.cash/v3/`
const TESTNET_API = `http://testnet.bchjs.cash/v3/`

const BCHJS = require("../../../../src/bch-js")

// Instantiate bch-js based on the network.
let bchjs
if (NETWORK === `mainnet`) bchjs = new BCHJS({ restURL: MAINNET_API })
else bchjs = new BCHJS({ restURL: TESTNET_API })

// Open the wallet generated with create-wallet.
try {
  var walletInfo = require(`../create-wallet/wallet.json`)
} catch (err) {
  console.log(
    `Could not open wallet.json. Generate a wallet with create-wallet first.`
  )
  process.exit(0)
}

const SEND_ADDR = walletInfo.cashAddress
const SEND_WIF = walletInfo.WIF

async function sendBch() {
  try {
    // Send the money back to yourself if the users hasn't specified a destination.
    if (RECV_ADDR === "") RECV_ADDR = SEND_ADDR

    // Get the balance of the sending address.
    const balance = await getBCHBalance(SEND_ADDR, false)
    console.log(`balance: ${JSON.stringify(balance, null, 2)}`)
    console.log(`Balance of sending address ${SEND_ADDR} is ${balance} BCH.`)

    // Exit if the balance is zero.
    if (balance <= 0.0) {
      console.log(`Balance of sending address is zero. Exiting.`)
      process.exit(0)
    }

    const SEND_ADDR_LEGACY = bchjs.Address.toLegacyAddress(SEND_ADDR)
    const RECV_ADDR_LEGACY = bchjs.Address.toLegacyAddress(RECV_ADDR)
    console.log(`Sender Legacy Address: ${SEND_ADDR_LEGACY}`)
    console.log(`Receiver Legacy Address: ${RECV_ADDR_LEGACY}`)

    const balance2 = await getBCHBalance(RECV_ADDR, false)
    console.log(`Balance of recieving address ${RECV_ADDR} is ${balance2} BCH.`)

    const u = await bchjs.Insight.Address.utxo(SEND_ADDR)
    //console.log(`u: ${JSON.stringify(u, null, 2)}`)
    const utxo = findBiggestUtxo(u.utxos)
    console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    if (NETWORK === `mainnet`)
      var transactionBuilder = new bchjs.TransactionBuilder()
    else var transactionBuilder = new bchjs.TransactionBuilder("testnet")

    const satoshisToSend = SATOSHIS_TO_SEND
    const originalAmount = utxo.satoshis
    const vout = utxo.vout
    const txid = utxo.txid

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = bchjs.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 2 })
    console.log(`byteCount: ${byteCount}`)
    const satoshisPerByte = 1.0
    const txFee = Math.floor(satoshisPerByte * byteCount)
    console.log(`txFee: ${txFee}`)

    // amount to send back to the sending address.
    // It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - satoshisToSend - txFee

    // add output w/ address and amount to send
    transactionBuilder.addOutput(RECV_ADDR, satoshisToSend)
    transactionBuilder.addOutput(SEND_ADDR, remainder)

    const ecPair = bchjs.ECPair.fromWIF(SEND_WIF)

    // Sign the transaction with the HD node.
    let redeemScript
    transactionBuilder.sign(
      0,
      ecPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // build tx
    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()
    console.log(`TX hex: ${hex}`)
    console.log(` `)

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])
    console.log(`Transaction ID: ${txidStr}`)
    console.log(`Check the status of your transaction on this block explorer:`)
    console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`)
  } catch (err) {
    console.log(`error: `, err)
  }
}
sendBch()

// Get the balance in BCH of a BCH address.
async function getBCHBalance(addr, verbose) {
  try {
    const result = await bchjs.Blockbook.balance(addr)

    if (verbose) console.log(result)

    const bchBalance =
      Number(result.balance) + Number(result.unconfirmedBalance)

    return bchBalance
  } catch (err) {
    console.error(`Error in getBCHBalance: `, err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
