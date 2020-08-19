# Sell SLP

This example shows the basics of how to construct a collaborative transaction for trustlessly selling SLP tokens. There are two parties in this example: the Seller and the Buyer. The Seller offers a SLP token UTXO for sale. The Buyer accepts the offer by constructing a partially signed transaction with that UTXO. The Buyer gives the transaction to the Seller, who checks it, and if satisfied, will sign and broadcast the final transaction. The result of the transaction is that the Seller is paid in BCH for their tokens, and the tokens are transferred to the Buyers wallet.

## Basic Workflow

To run through the example. Follow these instructions and run each step with `npm start` or `npm run <script>`:

- [create-wallets](./create-wallets) will create two wallets. One for the Seller and one for the Buyer. Run with `npm start`.
