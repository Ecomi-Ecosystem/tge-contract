const OMIToken = artifacts.require('./OMIToken.sol')
const OMITokenLock = artifacts.require('./OMITokenLock.sol')

module.exports = function (deployer, network, accounts) {
  deployer.then(async () => {
    const ownerAddress = accounts[0]
    console.log('Owner Address:', ownerAddress)

    const allowanceProvider = accounts[0]
    console.log('Allowance Provider Address:', allowanceProvider)

    await deployer.deploy(OMIToken, { from: ownerAddress })

    await deployer.deploy(OMITokenLock, OMIToken.address, allowanceProvider, {
      from: ownerAddress
    })
  })
}
