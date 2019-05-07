const OMIToken = artifacts.require('OMIToken')

const BN = web3.utils.BN
const toBN = web3.utils.toBN
const chai = require('chai')
const expect = chai.expect
chai.use(require('bn-chai')(BN))
chai.use(require('chai-as-promised'))

contract('OMIToken', accounts => {
  let token
  const owner = accounts[0]
  const notOwner = accounts[1]
  const beneficiary1 = accounts[2]
  const beneficiary2 = accounts[3]
  const tokenCap = toBN(750000000000).mul(toBN(1e18))

  beforeEach(async () => {
    token = await OMIToken.new({ from: owner })
  })

  it('should have the correct token settings', async () => {
    const name = await token.name()
    expect(name).to.equal('OMI Token')

    const symbol = await token.symbol()
    expect(symbol).to.equal('OMI')

    const cap = await token.cap()
    expect(cap).to.eq.BN(tokenCap)

    const totalSupply = await token.totalSupply()
    expect(totalSupply).to.eq.BN(0)
  })

  it('should have the correct owner', async () => {
    const ownerIsMinter = await token.isMinter(owner)
    const ownerIsPauser = await token.isPauser(owner)
    expect(ownerIsMinter).to.be.true
    expect(ownerIsPauser).to.be.true
  })

  it('should only allow the owner to mint', async () => {
    await expect(token.mint(beneficiary1, 100, { from: notOwner })).to.be
      .rejected
    await expect(token.mint(beneficiary1, 100, { from: owner })).to.be.fulfilled
  })

  it('should only allow 750,000,000,000 token to be minted', async () => {
    await expect(token.mint(beneficiary1, tokenCap, { from: owner })).to.be
      .fulfilled
    await expect(token.mint(beneficiary1, 1, { from: owner })).to.be.rejected
  })

  it('should be pausable', async () => {
    await expect(token.mint(beneficiary1, 100, { from: owner })).to.be.fulfilled

    await expect(token.pause({ from: notOwner })).to.be.rejected
    await expect(token.pause({ from: owner })).to.be.fulfilled
    await expect(token.transfer(beneficiary2, 100, { from: beneficiary1 })).to
      .be.rejected

    await expect(token.unpause({ from: notOwner })).to.be.rejected
    await expect(token.unpause({ from: owner })).to.be.fulfilled

    await expect(token.transfer(beneficiary2, 100, { from: beneficiary1 })).to
      .be.fulfilled
  })

  it('should be able to mint while paused', async () => {
    await expect(token.pause({ from: owner })).to.be.fulfilled
    await expect(token.mint(beneficiary1, 100, { from: owner })).to.be.fulfilled
  })

  it('should be able to provide an allowance', async () => {
    await expect(token.mint(owner, 100, { from: owner })).to.be.fulfilled
    await token.approve(beneficiary1, 100, { from: owner })
    const allowance = await token.allowance(owner, beneficiary1)
    expect(allowance).to.eq.BN(100)
    await expect(
      token.transferFrom(owner, beneficiary2, 100, { from: beneficiary1 })
    ).to.be.fulfilled
  })
})
