/*
  Mint a NFT Group tokens.
*/

// EDIT THESE VALUES FOR YOUR USE.
const TOKENID =
  '961c6a9f40da97c032b7249493a0bf70944696bbacfd94e831f58f0737e2e9be'
const TOKENQTY = 1 // The quantity of new tokens to mint.
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

async function mintNFTGroup () {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    // master HDNode
    const masterHDNode = bchjs.HDNode.fromSeed(rootSeed)

    // HDNode of BIP44 account
    const account = bchjs.HDNode.derivePath(masterHDNode, "m/44'/245'/0'")

    const change = bchjs.HDNode.derivePath(account, '0/0')

    // get the cash address
    const cashAddress = bchjs.HDNode.toCashAddress(change)
    // const slpAddress = bchjs.SLP.Address.toSLPAddress(cashAddress)

    // Get a UTXO to pay for the transaction.
    const utxos = await bchjs.Utxo.get(cashAddress)
    // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

    // Separate UTXO types
    const bchUtxos = utxos.bchUtxos
    let groupBatons = utxos.slpUtxos.group.mintBatons

    if (bchUtxos.length === 0) {
      throw new Error('No UTXOs to pay for transaction! Exiting.')
    }

    // Filter out the token UTXOs that match the user-provided token ID
    // and contain the minting baton.
    groupBatons = groupBatons.filter((utxo, index) => {
      if (
        utxo && // UTXO is associated with a token.
        utxo.tokenId === TOKENID && // UTXO matches the token ID.
        utxo.type === 'baton' && // UTXO is not a minting baton.
        utxo.tokenType === 129 // UTXO is for NFT Group
      ) { return true }

      return false
    })
    console.log(`groupBatons: ${JSON.stringify(groupBatons, null, 2)}`)

    if (groupBatons.length === 0) {
      throw new Error('No token UTXOs for the specified token could be found.')
    }

    // Choose a UTXO to pay for the transaction.
    const utxo = bchjs.Utxo.findBiggestUtxo(bchUtxos)
    // console.log(`bchUtxo: ${JSON.stringify(bchUtxo, null, 2)}`);

    // instance of transaction builder
    const transactionBuilder = new bchjs.TransactionBuilder()

    const originalAmount = utxo.value
    const vout = utxo.tx_pos
    const txid = utxo.tx_hash

    // add input to pay for the transaction.
    transactionBuilder.addInput(txid, vout)

    // add the mint baton as an input.
    transactionBuilder.addInput(groupBatons[0].tx_hash, groupBatons[0].tx_pos)

    // Set the transaction fee. Manually set for ease of example.
    const txFee = 550

    // amount to send back to the sending address.
    // Subtract two dust transactions for minting baton and tokens.
    const remainder = originalAmount - 546 - txFee

    // Generate the SLP OP_RETURN.
    const script = bchjs.SLP.NFT1.mintNFTGroupOpReturn(groupBatons, TOKENQTY)

    // OP_RETURN needs to be the first output in the transaction.
    transactionBuilder.addOutput(script, 0)

    // Send dust transaction representing the new tokens.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      546
    )

    // Send dust transaction representing minting baton.
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(cashAddress),
      546
    )

    // add output to send BCH remainder of UTXO.
    transactionBuilder.addOutput(cashAddress, remainder)

    // Generate a keypair from the change address.
    const keyPair = bchjs.HDNode.toKeyPair(change)

    // Sign the transaction for the UTXO input that pays for the transaction..
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // Sign the Token UTXO minting baton input
    transactionBuilder.sign(
      1,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      546
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
    console.log(`https://slp-explorer.salemkode.com/tx/${txidStr}`)
  } catch (err) {
    console.error('Error in mintNFTGroup: ', err)
  }
}
mintNFTGroup()
