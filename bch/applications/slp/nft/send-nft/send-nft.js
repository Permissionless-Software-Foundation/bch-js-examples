/*
  Send Child NFT tokens of type TOKENID to user with SLPADDR address.
*/

// CUSTOMIZE THESE VALUES FOR YOUR USE
const TOKENID =
  'fb4b972328199e4538b93760ce4598b087ccd5c71e459c6384dc2ebc20b743a2'
let TO_SLPADDR = 'simpleledger:qrxnq2ta5fe3whyfsekfz648c48tzd8urspw8f3h07'

// REST API servers.
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v5/'

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@psf/bch-js')

// Instantiate bch-js based on the network.
const bchjs = new BCHJS({ restURL: BCHN_MAINNET })

// Open the wallet generated with create-wallet.
let walletInfo
try {
  walletInfo = require('../../create-wallet/wallet.json')
} catch (err) {
  console.log(
    'Could not open wallet.json. Generate a wallet with create-wallet first.'
  )
  process.exit(0)
}
// console.log(`walletInfo: ${JSON.stringify(walletInfo, null, 2)}`)

async function sendChildToken () {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)

    // master HDNode
    const masterHDNode = bchjs.HDNode.fromSeed(rootSeed)

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'")
    const change = bchjs.HDNode.derivePath(account, '0/0')

    // Generate an EC key pair for signing the transaction.
    const keyPair = bchjs.HDNode.toKeyPair(change)

    // get the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change)
    const slpAddress = bchjs.HDNode.toSLPAddress(change)

    // Get a UTXO to pay for the transaction.
    const utxos = await bchjs.Utxo.get(cashAddress)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    // Separate UTXO types
    const bchUtxos = utxos.bchUtxos
    let nftTokens = utxos.slpUtxos.nft.tokens

    if (bchUtxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.')
    }

    // Filter out the token UTXOs that match the user-provided token ID
    // and contain the minting baton.
    nftTokens = nftTokens.filter((utxo, index) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === TOKENID
      ) { return true }

      return false
    })
    console.log(`nft token UTXOs: ${JSON.stringify(nftTokens, null, 2)}`)

    if (nftTokens.length === 0) {
      throw new Error('No token UTXOs for the specified token could be found.')
    }

    // Choose a UTXO to pay for the transaction.
    const utxo = bchjs.Utxo.findBiggestUtxo(bchUtxos)
    // console.log(`bchUtxo: ${JSON.stringify(bchUtxo, null, 2)}`);

    const slpSendObj = bchjs.SLP.NFT1.generateNFTChildSendOpReturn(
      nftTokens,
      1
    )
    const slpData = slpSendObj.script
    // console.log(`slpOutputs: ${slpSendObj.outputs}`);

    // BEGIN transaction construction.

    // instance of transaction builder
    const transactionBuilder = new bchjs.TransactionBuilder()

    // Add the BCH UTXO as input to pay for the transaction.
    const originalAmount = utxo.value
    transactionBuilder.addInput(utxo.tx_hash, utxo.tx_pos)

    // add each token UTXO as an input.
    for (let i = 0; i < nftTokens.length; i++) {
      transactionBuilder.addInput(nftTokens[i].tx_hash, nftTokens[i].tx_pos)
    }

    // get byte count to calculate fee. paying 1 sat
    // Note: This may not be totally accurate. Just guessing on the byteCount size.
    // const byteCount = this.BITBOX.BitcoinCash.getByteCount(
    //   { P2PKH: 3 },
    //   { P2PKH: 5 }
    // )
    // //console.log(`byteCount: ${byteCount}`)
    // const satoshisPerByte = 1.1
    // const txFee = Math.floor(satoshisPerByte * byteCount)
    // console.log(`txFee: ${txFee} satoshis\n`)
    const txFee = 250

    // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - txFee - 546 * 2
    if (remainder < 1) {
      throw new Error('Selected UTXO does not have enough satoshis')
    }
    // console.log(`remainder: ${remainder}`)

    // Add OP_RETURN as first output.
    transactionBuilder.addOutput(slpData, 0)

    // Send the token back to the same wallet if the user hasn't specified a
    // different address.
    if (TO_SLPADDR === '') TO_SLPADDR = walletInfo.slpAddress

    // Send dust transaction representing tokens being sent.
    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(TO_SLPADDR),
      546
    )

    // Return any token change back to the sender.
    if (slpSendObj.outputs > 1) {
      transactionBuilder.addOutput(
        bchjs.SLP.Address.toLegacyAddress(slpAddress),
        546
      )
    }

    // Last output: send the BCH change back to the wallet.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      remainder
    )

    // Sign the transaction with the private key for the BCH UTXO paying the fees.
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // Sign each token UTXO being consumed.
    for (let i = 0; i < nftTokens.length; i++) {
      const thisUtxo = nftTokens[i]

      transactionBuilder.sign(
        1 + i,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        thisUtxo.value
      )
    }

    // build tx
    const tx = transactionBuilder.build()

    // output rawhex
    const hex = tx.toHex()
    // console.log(`Transaction raw hex: `, hex)

    // END transaction construction.

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])
    console.log(`Transaction ID: ${txidStr}`)

    console.log('Check the status of your transaction on this block explorer:')
    console.log(`https://slp-explorer.salemkode.com/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in sendToken: ', err)
    console.log(`Error message: ${err.message}`)
  }
}
sendChildToken()
