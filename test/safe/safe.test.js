// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
"use strict";

const { test } = require("brittle");
const BIP39Seed = require("wallet-seed-bip39");
const Provider = require("lib-wallet-pay-evm/src/provider.js");
const ERC20 = require("lib-wallet-pay-evm/src/erc20.js");
const { Erc20CurrencyFactory } = require("lib-wallet-util-evm");
const { WalletStoreHyperbee } = require("lib-wallet-store");
const EthPay = require("../../src/wallet-pay-eth.js");
const KeyManager = require("../../src/wallet-key-eth.js");
const opts = require("./safe.opts.json");
const { ERC20 } = require("lib-wallet-pay-evm");

const TMP_STORE = "./tmp";

const ABI = [
  {
    "constant": true,
    "inputs": [
      { "name": "who", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

const TestToken = new Erc20CurrencyFactory({
  name: "TestToken",
  base_name: "TestToken",
  contract_address: opts.safe.paymasterTokenAddress,
  decimal_places: 6
});

async function activeWallet(param = {}) {
  let provider = param.provider;
  if (!param.provider) {
    provider = new Provider({
      web3: opts.web3,
      indexer: opts.indexer,
      indexerWs: opts.indexerWs,
    });
    await provider.connect();
  }

  const store = new WalletStoreHyperbee({
    store_path: param.store ? TMP_STORE : null,
  });

  await store.init();

  const eth = new EthPay({
    asset_name: "eth",
    provider,
    key_manager: new KeyManager({
      seed: param.newWallet
        ? await BIP39Seed.generate()
        : await BIP39Seed.generate(
            param.seed ||
              "taxi carbon sister jeans notice combine once carpet know dice oil solar"
          ),
    }),
    store,
    network: "regtest",
    token: [
      new ERC20({ currency: TestToken })
    ],
    gas_token: {
      name: "ETH",
      base_name: "wei",
      decimals: 18,
    },
    auth_signer_private_key: "a70a71add3092e3c63f11545a62024d1ff3ff55a202eca094a2d5832c470bd29",
    safe: opts.safe
  });
  await eth.initialize({});
  return eth;
}

test("transfer 1 token from an abstracted account to another address", async (t) => {
  async function getBalance(address, toAddress) {
    return {
      address: await token.methods.balanceOf(address).call(),
      toAddress: await token.methods.balanceOf(toAddress).call()
    }
  }

  const eth = await activeWallet({ newWallet: false });
  const addr = await eth.getNewAddress();
  const address = addr.address;

  const toAddress = "0x636e9c21f27d9401ac180666bf8DC0D3FcEb0D24";
  const amount = 1_000_000;

  const web3 = eth.web3;

  const abstractedAddress = await eth.getAbstractedAddress(address);

  t.comment("Abstracted address:", abstractedAddress);

  t.comment("Make sure that the abstracted address has enough token funds to repay the paymaster!");

  const { paymasterTokenAddress } = opts.safe;
  const token = new web3.eth.Contract(ABI, paymasterTokenAddress);

  const tx = {
    token: "TestToken",
    to: toAddress,
    value: amount
  };

  const initialBalance = await getBalance(address, toAddress);

  const gasCost = await eth.estimateGaslessTransactionGasCost(address, tx);

  t.comment("Gasless transaction gas cost estimation (in wei):", gasCost);

  const id = await eth.sendGaslessTokenTransfer(address, tx);

  t.comment("Gasless transaction id:", id);

  t.comment("Waiting for the gasless transaction to be included in a block...");

  while (true) {
    const receipt = await eth.getGaslessTransactionReceipt(id);

    if (receipt)
      break;

    // Try again in 1 second
    await new Promise(r => setTimeout(r, 1_000));
  }

  const balance = await getBalance(address, toAddress);

  t.comment("Gasless transaction receipt found!")

  const fee = initialBalance.address - balance.address - amount;
   
  t.comment(`The gasless transaction cost ${fee} tokens to the user.`);

  t.ok(initialBalance.address - balance.address > amount, 
    `${amount} tokens have been transferred out of the safe account.`);

  t.ok(balance.toAddress - initialBalance.toAddress == amount,
    `${toAddress} has received ${amount} tokens from the safe account.`);
});