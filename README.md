This repository contains a series of small example apps that illustrate how to
code up common use cases for a Bitcoin Cash application using
the [bch-js](https://www.npmjs.com/package/@chris.troutner/bch-js) JavaScript
library and the [bch-api](https://fullstack.cash/documentation/) REST API, offered by
[FullStack.cash](https://fullstack.cash)

Here are two YouTube walk-through videos to help you get started:
- [Introduction to bch-js and the bch-js-examples repository](https://youtu.be/GD2i1ZUiyrk)
- [Working with the FullStack.cash JWT token](https://youtu.be/OdJOleHoSo8)

The `low-level` directory
contains low-level applications exercising a single feature of bch-js. Think of
these examples like lego blocks that can be used to build a bigger app.

The `applications` directory contains example applications like wallets, tokens,
voting, and other ideas.

For a full-blown wallet, check out the [slp-cli-wallet](https://www.npmjs.com/package/slp-cli-wallet). This is both a command-line wallet as well as an NPM
JavaScript library for providing high-level wallet functionality to your own
applications.

If you want to chat with other developers interested in Bitcoin Cash, be sure
to [join our Telegram channel](https://t.me/bch_js_toolkit).

## Installation
Prior to running these examples, you need to setup this code repository. In the
root directory run this commands to install the required dependencies.
```
npm install
```

## Running Examples
You can run each example script by entering its directory and executing `npm start`

## More Information
If you're new to Bitcoin Cash or need to brush up on your fundamentals, here are
some resources:
- [Mastering Bitcoin Cash](https://github.com/Bitcoin-com/mastering-bitcoin-cash)
- [bch-js and bch-api Documentation](https://fullstack.cash/documentation/)

## Basic BCH Wallet Functions
These basic examples in the `applications/wallet` directory are used to bootstrap
a BCH wallet for use with the other examples. Recommended path:

1. [Create a testnet wallet](applications/wallet/create-wallet/create-wallet.js)
2. [Fund it with the testnet faucet](https://fullstack.cash/faucet/)
3. [Check the balance](applications/wallet/check-balance/check-balance.js)
4. [Send some BCH](applications/wallet/send-bch/send-bch.js)

### A note about testnet
Testnet isn't just a network for software developers. Many mining pools,
research labs, and even malicious miners, use the testnet and can disrupt the
development workflow. Most professional developers on the Bitcoin Cash network
prefer to use mainnet. They use 1000 satoshi transactions (a fraction of a penny)
to test their software, and avoid using the disruptive testnet.

That being said. FullStack.cash provides a [testnet faucet here](https://fullstack.cash/faucet/) to help developers get started without needing to purchase any Bitcoin Cash.
