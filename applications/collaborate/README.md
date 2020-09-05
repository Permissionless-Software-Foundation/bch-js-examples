# Collaborative Transaction Examples

This directory contains code examples for generating **collaborative transactions**. These are transactions that are partially signed, and passed around to multiple parties. They each collaborate by building a part of the final transaction, but the transaction is inherently trustless: At no point can one party take the money from another party.

**WARNING:** These examples default to mainnet. Use small amount of money, like 10,000 satoshis or less, when running these examples.

- [sell-slp](./sell-slp) is an example inspired by Vin Armani's [SLP exchange example](https://github.com/vinarmani/swap-bch-js/blob/master/examples/e2e_exchange.js) (which uses [SWaP protocol](https://github.com/vinarmani/swap-protocol)). This example does not use SWaP protocol. It shows the basics of how a 'Seller' can offer an SLP token UTXO for sale to a 'Buyer'. They collaborate to build the transaction and complete the purchase. This is an example of a 'serial' or 'round-robin' collaborative transaction. A transaction is passed around from one party to another. The final transaction is broadcasted by the last party.

- The [coinjoin](./coinjoin) example shows how to use collaborative transactions to execute a [CoinJoin](https://en.bitcoin.it/wiki/CoinJoin) transaction. Three people (Alice, Bob, and Sam) collaborate to shuffle their money and increase their anonymity. This is an example of a 'parallel' or 'compiled' transaction. Each actor signs their own copy of the transaction, and returns it to a central party (a server, or a designated user). The final, fully-signed transaction is compiled from these parallel copies, then broadcast to the network.
