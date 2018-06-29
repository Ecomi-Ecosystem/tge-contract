const OMIToken = artifacts.require('./OMIToken.sol')
const OMICrowsdale = artifacts.require('./OMICrowdsale.sol')
const OMITokenLock = artifacts.require('./OMITokenLock.sol')

module.exports = function (deployer, network, accounts) {
  deployer.then(async () => {
    // Current OMI Rate as of 6/29
    const rate = new web3.BigNumber(8434)

    const ownerAddress = accounts[0]
    console.log('Owner Address:', ownerAddress)

    const allowanceProvider = accounts[0]
    console.log('Allowance Provider Address:', allowanceProvider)

    // Production ETH Wallet
    const ETHWallet = '0xa93d2cfae313cfbb4235a603d0b82fc75ae6a372'
    console.log('ETH Wallet Address:', ETHWallet)

    await deployer.deploy(OMIToken, { from: ownerAddress })
    await deployer.deploy(OMITokenLock, OMIToken.address, allowanceProvider, {
      from: ownerAddress
    })
    await deployer.deploy(
      OMICrowsdale,
      rate,
      ETHWallet,
      OMIToken.address,
      OMITokenLock.address,
      { from: ownerAddress }
    )
  })
}
