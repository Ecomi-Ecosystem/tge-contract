const OMIToken = artifacts.require('./OMIToken.sol')
const OMICrowsdale = artifacts.require('./OMICrowdsale.sol')
const OMITokenLock = artifacts.require('./OMITokenLock.sol')

module.exports = function (deployer, network, accounts) {
  deployer.then(async () => {
    const rate = new web3.BigNumber(10000)
    const ETHWallet = process.env.ETHWALLET_ADDRESS

    await deployer.deploy(OMIToken)
    await deployer.deploy(OMITokenLock, OMIToken.address, accounts[0])
    await deployer.deploy(
      OMICrowsdale,
      rate,
      ETHWallet,
      OMIToken.address,
      OMITokenLock.address
    )
  })
}
