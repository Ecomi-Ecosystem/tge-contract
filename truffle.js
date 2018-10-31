const HDWalletProvider = require('truffle-hdwallet-provider')
const mnemonic = process.env.MNEMONIC

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*' // Match any network id
    },
    production: {
      provider: function () {
        return new HDWalletProvider(mnemonic, process.env.INFURA_MAINNET)
      },
      network_id: '*'
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(mnemonic, process.env.INFURA_RINKEBY)
      },
      network_id: '*'
    }
  }
}
