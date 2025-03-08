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
'use strict'

const { EvmPay } = require('lib-wallet-pay-evm')
const FeeEstimator = require('./fee-estimator.js')
const Ethereum = require('./eth.currency.js')

class WalletPayEthereum extends EvmPay {
  constructor (config) {
    super({
      ...config,
      asset_name: "eth",
      chainId: 0,
      startSyncTxFromBlock: 6_810_041,
      feeEstimator: new FeeEstimator(),
      GasCurrency: Ethereum,
      wallet: {
        coinType: "60'",
        purpose: "44'",
        gapLimit: 5
      }
    })
  }
}

module.exports = WalletPayEthereum
