/*
  Reads the OP_RETURN data encoded in a transaction with the write-op-return.js
  example.

  It assumes that the OP_RETURN exists in the first output (vout = 0) of the
  transaction.
*/

// Specific TXID to analyize.
const TXID = 'c0fef17174397e9fd2cdbada0ac121d134296ace94d12bd990d6e1e1351139b9'

const BCHJS = require('@chris.troutner/bch-js')
const bchjs = new BCHJS()

async function readOpReturn (txid) {
  try {
    // Get the raw transaction data.
    const txData = await bchjs.RawTransactions.getRawTransaction(txid, true)
    // console.log(`txData: ${JSON.stringify(txData, null, 2)}`);

    // Decode the hex into normal text.
    const script = bchjs.Script.toASM(
      Buffer.from(txData.vout[0].scriptPubKey.hex, 'hex')
    ).split(' ')
    // console.log(`script: ${JSON.stringify(script, null, 2)}`);

    if (script[0] !== 'OP_RETURN') throw new Error('Not an OP_RETURN')

    const msg = Buffer.from(script[2], 'hex').toString('ascii')
    console.log(`Message encoded in the OP_RETURN: ${msg}`)
  } catch (err) {
    console.error('Error in readOpReturn(): ', err)
  }
}
readOpReturn(TXID)
