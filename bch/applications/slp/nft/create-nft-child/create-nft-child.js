/*
  Create a new NFT Child SLP token. Requires:
  - a wallet created with the create-wallet example.
  - wallet to have a small BCH balance.
  - At least one NFT Group token needs to have been created with the
    create-nft-group example.
*/

// EDIT THESE VALUES FOR YOUR USE.
const TOKENID =
  '90fb0179ffa3426d5b402a0a19e74576863851ad32a861c5dcb99c7f9eeeed96'
// const TO_SLPADDR = '' // The address to send the new tokens.

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

async function createNFTChild () {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    // master HDNode
    const masterHDNode = bchjs.HDNode.fromSeed(rootSeed)

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'")

    const change = bchjs.HDNode.derivePath(account, '0/0')

    // ge-childt the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change)
    // const slpAddress = bchjs.SLP.Address.toSLPAddress(cashAddress)

    // Get a UTXO to pay for the transaction.
    const utxos = await bchjs.Utxo.get(cashAddress)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    // Separate UTXO types
    const bchUtxos = utxos.bchUtxos
    let groupUtxos = utxos.slpUtxos.group.tokens

    if (utxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.')
    }

    // Filter out the token UTXOs that match the user-provided token ID
    // and contain the minting baton.
    groupUtxos = groupUtxos.filter((utxo, index) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === TOKENID && // UTXO matches the token ID.
        utxo.type === 'token' // UTXO is not a minting baton.
      ) {
        return true
      }

      return false
    })
    // console.log(`groupUtxos: ${JSON.stringify(groupUtxos, null, 2)}`);

    if (groupUtxos.length === 0) {
      throw new Error('No token UTXOs for the specified Group token could be found.')
    }

    // Get the biggest UTXO to pay for the transaction.
    const utxo = bchjs.Utxo.findBiggestUtxo(bchUtxos)
    // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

    // instance of transaction builder
    const transactionBuilder = new bchjs.TransactionBuilder()

    const originalAmount = utxo.value
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // add the NFT Group UTXO as an input. This NFT Group token must be burned
    // to create a Child NFT, as per the spec.
    transactionBuilder.addInput(groupUtxos[0].tx_hash, groupUtxos[0].tx_pos)

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout)

    // Set the transaction fee. Manually set for ease of example.
    const txFee = 550

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - txFee

    // Generate SLP config object
    const configObj = {
      name: 'NFT Child',
      ticker: 'NFT004',
      documentUrl: 'https://FullStack.cash'
    }

    // Generate the OP_RETURN entry for an SLP GENESIS transaction.
    const script = bchjs.SLP.NFT1.generateNFTChildGenesisOpReturn(configObj)
    // const data = bchjs.Script.encode(script)
    // const data = compile(script)

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0)

    // Send dust transaction representing the tokens.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      // bchjs.Address.toLegacyAddress('bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'),
      546
    )

    // Send dust transaction representing minting baton.
    // transactionBuilder.addOutput(
    //   bchjs.Address.toLegacyAddress(cashAddress),
    //   546
    // );

    // add output to send BCH remainder of UTXO.
    transactionBuilder.addOutput(cashAddress, remainder)

    // Generate a keypair from the change address.
    const keyPair = bchjs.HDNode.toKeyPair(change)

    let redeemScript

    // Sign the Token UTXO for the NFT Group token that will be burned in this
    // transaction.
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      546
    )

    // Sign the input for the UTXO paying for the TX.
    transactionBuilder.sign(
      1,
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
    // console.log(` `)

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])
    console.log('Check the status of your transaction on this block explorer:')
    console.log(`https://slp-explorer.vercel.app/token/${txidStr}`)
  } catch (err) {
    console.error('Error in createNFTChild: ', err)
  }
}
createNFTChild()

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo (utxos) {
  let largestAmount = 0
  let largestIndex = 0

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]

    if (thisUtxo.value > largestAmount) {
      largestAmount = thisUtxo.value
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
