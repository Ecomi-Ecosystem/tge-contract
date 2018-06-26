const OMIToken = artifacts.require('OMIToken')

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
  const tokenCap = new BigNumber(1000000000).times(1e18)

  beforeEach(async () => {
    token = await OMIToken.new({ from: owner })
  })

  it('should have the correct token settings', async () => {
    const name = await token.name()
    name.should.equal('Ecomi Token')

    const symbol = await token.symbol()
    symbol.should.equal('OMI')

    const cap = await token.cap()
    cap.should.be.bignumber.equal(tokenCap)

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
    await token.mint(beneficiary1, tokenCap, { from: owner }).should.be
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

  it('should be able to provide an allowance', async () => {
    await token.mint(owner, 100, { from: owner }).should.be.fulfilled
    await token.approve(beneficiary1, 100, { from: owner })
    const allowance = await token.allowance(owner, beneficiary1)
    allowance.should.be.bignumber.equal(100)
    await token.transferFrom(owner, beneficiary2, 100, { from: beneficiary1 })
      .should.be.fulfilled
  })
})
