# Collaborative Transaction Examples

This directory contains code examples for generating **collaborative transactions**. These are transactions that are partially signed, and passed around to multiple parties. They each collaborate by building a part of the final transaction.

- [sell-slp](./sell-slp) is an example inspired by Vin Armani's [SLP exchange example](https://github.com/vinarmani/swap-bch-js/blob/master/examples/e2e_exchange.js) (which uses [SWaP protocol](https://github.com/vinarmani/swap-protocol)). This example does not use SWaP protocol. It shows the basics of how a 'Seller' can offer an SLP token UTXO for sale to a 'Buyer'. They collaborate to build the transaction and complete the purchase.
