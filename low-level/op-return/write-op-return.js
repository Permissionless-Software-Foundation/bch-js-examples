/*
  Generates and broadcasts a BCH transaction which includes an OP_RETURN
  including text data in the transaction.
*/

// You can generate a WIF (private key) and public address using the
// 'get-key' command of slp-cli-wallet.
const WIF = 'L3E1e8td9o71q8oYwFs4dwnNpq3LnxB67dtEo5aAqsHCgysJye5e'
const ADDR = 'bitcoincash:qr9jqgjlx2fqldyy2pj8nmxr0vuu59k0wsumalhexa'

// Customize the message you want to send
const MESSAGE = 'BURN abcdef'

const BCHJS = require('@chris.troutner/bch-js')
const bchjs = new BCHJS()

async function writeOpReturn (msg, wif) {
  try {
    // Create an EC Key Pair from the user-supplied WIF.
    const ecPair = bchjs.ECPair.fromWIF(wif)

    // Generate the public address that corresponds to this WIF.
    const addr = bchjs.ECPair.toCashAddress(ecPair)
    console.log(`Publishing "${msg}" to ${addr}`)

    // Pick a UTXO controlled by this address.
    const utxos = await bchjs.Blockbook.utxo(addr)
    const utxo = await findBiggestUtxo(utxos)

    // instance of transaction builder
    const transactionBuilder = new bchjs.TransactionBuilder()

    const originalAmount = utxo.satoshis
    const vout = utxo.vout
    const txid = utxo.txid

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // TODO: Compute the 1 sat/byte fee.
    const fee = 500

    // BEGIN - Construction of OP_RETURN transaction.

    // Add the OP_RETURN to the transaction.
    const script = [
      bchjs.Script.opcodes.OP_RETURN,
      Buffer.from('6d02', 'hex'), // Makes message comply with the memo.cash protocol.
      Buffer.from(`${msg}`)
    ]

    // Compile the script array into a bitcoin-compliant hex encoded string.
    const data = bchjs.Script.encode(script)

    // Add the OP_RETURN output.
    transactionBuilder.addOutput(data, 0)

    // END - Construction of OP_RETURN transaction.

    // Send the same amount - fee.
    transactionBuilder.addOutput(addr, originalAmount - fee)

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
    // console.log(`TX hex: ${hex}`);
    // console.log(` `);

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction(hex)
    console.log(`Transaction ID: ${txidStr}`)
    console.log(`https://memo.cash/post/${txidStr}`)
    console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
  } catch (err) {
    console.log('Error in writeOpReturn(): ', err)
  }
}
writeOpReturn(MESSAGE, WIF)

// Returns the utxo with the biggest balance from an array of utxos.
async function findBiggestUtxo (utxos) {
  if (!Array.isArray(utxos)) throw new Error('utxos needs to be an array')

  let largestAmount = 0
  let largestIndex = 0

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.satoshis > largestAmount) {
      // Ask the full node to validate the UTXO. Skip if invalid.
      const isValid = await bchjs.Blockchain.getTxOut(thisUtxo.txid, thisUtxo.vout)
      if (isValid === null) continue

      largestAmount = thisUtxo.satoshis
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
