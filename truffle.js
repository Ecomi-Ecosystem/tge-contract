const HDWalletProvider = require('truffle-hdwallet-provider')
const mnemonic = process.env.MNEMONIC

module.exports = {
  compilers: {
    solc: {
      version: '^0.5.2',
    },
  },
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
    },
    production: {
      provider: function() {
        return new HDWalletProvider(mnemonic, 'https://rpc.gochain.io:443')
      },
      network_id: '*',
    },
    testnet: {
      provider: function() {
        return new HDWalletProvider(mnemonic, 'https://testnet-rpc.gochain.io')
      },
      network_id: '*',
    },
  },
}
