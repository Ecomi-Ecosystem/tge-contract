const OMIToken = artifacts.require('OMIToken')
const OMITokenLock = artifacts.require('OMITokenLock')
const { duration, increaseTimeTo } = require('./helpers/increaseTime')
const { latestTime } = require('./helpers/latestTime')
const { ether } = require('./helpers/ether')

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('OMITokenLock', accounts => {
  let token
  let tokenLock
  const owner = accounts[0]
  const notOwner = accounts[1]
  const beneficiary1 = accounts[2]
  const beneficiary2 = accounts[3]

  beforeEach(async () => {
    token = await OMIToken.new({ from: owner })
  })

  it('should have the correct token settings', async () => {
    const name = await token.name()
    name.should.equal('Ecomi Token')

    const symbol = await token.symbol()
    symbol.should.equal('OMI')

    const cap = await token.cap()
    cap.should.be.bignumber.equal(1000000000)

    const totalSupply = await token.totalSupply()
    totalSupply.should.be.bignumber.equal(0)
  })

  it('should have the correct owner', async () => {
    const actualOwner = await token.owner()
    actualOwner.should.be.equal(owner)
  })

  it('should only allow the owner to mint', async () => {
    await token.mint(beneficiary1, 100, { from: notOwner }).should.be.rejected
    await token.mint(beneficiary1, 100, { from: owner }).should.be.fulfilled
  })

  it('should only allow 1,000,000,000 token to be minted', async () => {
    await token.mint(beneficiary1, 1000000000, { from: owner }).should.be
      .fulfilled
    await token.mint(beneficiary1, 1, { from: owner }).should.be.rejected
  })

  it('should be pausable', async () => {
    await token.mint(beneficiary1, 100, { from: owner }).should.be.fulfilled

    await token.pause({ from: notOwner }).should.be.rejected
    await token.pause({ from: owner }).should.be.fulfilled
    await token.transfer(beneficiary2, 100, { from: beneficiary1 }).should.be
      .rejected

    await token.unpause({ from: notOwner }).should.be.rejected
    await token.unpause({ from: owner }).should.be.fulfilled

    await token.transfer(beneficiary2, 100, { from: beneficiary1 }).should.be
      .fulfilled
  })

  it('should be able to mint while paused', async () => {
    await token.pause({ from: owner }).should.be.fulfilled
    await token.mint(beneficiary1, 100, { from: owner }).should.be.fulfilled
  })
})
