const OMIToken = artifacts.require('OMIToken')
const OMITokenLock = artifacts.require('OMITokenLock')
const { duration, increaseTimeTo } = require('./helpers/increaseTime')
const { latestTime } = require('./helpers/latestTime')

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('OMITokenLock', accounts => {
  let token
  let tokenLock
  let totalGas = 0
  const owner = accounts[0]
  const notOwner = accounts[1]
  const beneficiary1 = accounts[2]
  const beneficiary2 = accounts[3]

  beforeEach(async () => {
    token = await OMIToken.new({ from: owner })
    tokenLock = await OMITokenLock.new(token.address, owner, { from: owner })
    await tokenLock.setAllowanceAddress(owner)
    totalGas = 0
  })

  const addressBalanceShouldBe = async (address, amount) => {
    const balance = await tokenLock.getTokenBalance(address).should.be.fulfilled
    balance.should.be.bignumber.equal(amount)
  }

  const totalTokensLockedShouldBe = async amount => {
    const balance = await tokenLock.totalTokensLocked().should.be.fulfilled
    balance.should.be.bignumber.equal(amount)
  }

  const mintAndAllow = async amount => {
    const result1 = await token.mint(owner, amount).should.be.fulfilled
    const result2 = await token.increaseApproval(tokenLock.address, amount, {
      from: owner
    })
    totalGas += result1.receipt.gasUsed + result2.receipt.gasUsed
  }

  const lockTokens = async (to, duration, amount) => {
    const result = await tokenLock.lockTokens(to, duration, amount, {
      from: owner
    }).should.be.fulfilled
    totalGas += result.receipt.gasUsed
  }

  const mintAllowAndLockTokens = async (to, duration, amount) => {
    await mintAndAllow(amount).should.be.fulfilled
    await lockTokens(to, duration, amount).should.be.fulfilled
  }

  const releaseTokens = async from => {
    const result = await tokenLock.releaseTokens({ from }).should.be.fulfilled
    totalGas += result.receipt.gasUsed
  }

  const finishCrowdsale = async () => {
    const result = await tokenLock.finishCrowdsale({
      from: owner
    }).should.be.fulfilled
    totalGas += result.receipt.gasUsed
    const crowdsaleEndTime = await tokenLock.crowdsaleEndTime().should.be
      .fulfilled
    return crowdsaleEndTime.toNumber()
  }

  const finishCrowdsaleAndIncreaseTimeTo = async duration => {
    const crowdsaleEndTime = await finishCrowdsale()
    await increaseTimeTo(crowdsaleEndTime + duration).should.be.fulfilled
  }

  it('should store an allowance provider', async () => {
    const allowanceProvider = await tokenLock.allowanceProvider().should.be
      .fulfilled
    allowanceProvider.should.equal(owner)
  })

  it('should keep track of the number of tokens locked', async () => {
    await totalTokensLockedShouldBe(0)
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 3)
    await totalTokensLockedShouldBe(3)
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 6)
    await totalTokensLockedShouldBe(9)
    await finishCrowdsaleAndIncreaseTimeTo(duration.hours(3))
    await releaseTokens(beneficiary1)
    await totalTokensLockedShouldBe(0)
  })

  it('should be pausable', async () => {
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 100)

    await tokenLock.pause({ from: owner }).should.be.fulfilled

    await mintAndAllow(100)
    await tokenLock.lockTokens(beneficiary1, duration.hours(1), 100, {
      from: owner
    }).should.be.rejected

    await tokenLock.finishCrowdsale().should.be.rejected

    await tokenLock.unpause({ from: owner }).should.be.fulfilled

    await finishCrowdsaleAndIncreaseTimeTo(duration.hours(2))

    await tokenLock.pause({ from: owner }).should.be.fulfilled

    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.rejected

    await tokenLock.unpause({ from: owner }).should.be.fulfilled

    await tokenLock.releaseTokensByAddress(beneficiary1, { from: owner }).should
      .be.fulfilled
  })

  it('should only allow the owner to pause', async () => {
    await tokenLock.pause({ from: notOwner }).should.be.rejected
  })

  it('should keep track of the total amount of locked token for a given address', async () => {
    await finishCrowdsaleAndIncreaseTimeTo(duration.hours(2))

    let totalTokens = await tokenLock.getTokenBalance(beneficiary1)
    totalTokens.should.be.bignumber.equal(0)
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 3)
    await mintAllowAndLockTokens(beneficiary1, duration.hours(3), 3)
    totalTokens = await tokenLock.getTokenBalance(beneficiary1)
    totalTokens.should.be.bignumber.equal(6)

    await releaseTokens(beneficiary1)
    totalTokens = await tokenLock.getTokenBalance(beneficiary1)
    totalTokens.should.be.bignumber.equal(3)
  })

  it('should only allow locking tokens that have been provided as an allowance to the token lock contract', async () => {
    await tokenLock.lockTokens(beneficiary1, duration.hours(1), 1, {
      from: owner
    }).should.be.rejected

    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)

    await tokenLock.lockTokens(beneficiary1, duration.hours(1), 1, {
      from: owner
    }).should.be.rejected

    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)
  })

  it('should only allow owner to lock tokens', async () => {
    await mintAndAllow(1)

    await tokenLock.lockTokens(beneficiary1, duration.hours(1), 1, {
      from: notOwner
    }).should.be.rejected

    await lockTokens(beneficiary1, duration.hours(1), 1)
  })

  it('should only allow owner to revoke locked tokens', async () => {
    await mintAndAllow(1)

    await tokenLock.lockTokens(beneficiary1, duration.hours(1), 1, {
      from: owner
    }).should.be.fulfilled

    await tokenLock.revokeLockByIndex(beneficiary1, 0, { from: notOwner })
      .should.be.rejected
  })

  it('should allow owner to revoke locked tokens', async () => {
    await mintAndAllow(1)

    await tokenLock.lockTokens(beneficiary1, duration.hours(1), 1, {
      from: owner
    }).should.be.fulfilled

    await tokenLock.revokeLockByIndex(beneficiary1, 0, { from: owner }).should
      .be.fulfilled

    const lock = await tokenLock.getLockByIndex(beneficiary1, 0).should.be
      .fulfilled
    lock[3].should.be.true
  })

  it('should allow owner to lock tokens after the crowdsale is finished', async () => {
    await finishCrowdsale()
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)
  })

  it('should only allow the owner to finish the crowdsale', async () => {
    await tokenLock.finishCrowdsale({ from: notOwner }).should.be.rejected
  })

  it('should only allow the owner to finish the crowdsale once', async () => {
    await finishCrowdsale()
    await tokenLock.finishCrowdsale({ from: owner }).should.be.rejected
  })

  it('should only allow tokens to be released after the crowdsale is finished', async () => {
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)

    await increaseTimeTo(latestTime() + duration.hours(2)).should.be.fulfilled

    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.rejected

    const crowdsaleEndTime = await finishCrowdsale()

    await tokenLock.releaseTokens({ from: beneficiary1 })
    let lock = await tokenLock.getLockByIndex(beneficiary1, 0)
    lock[2].should.be.false

    await increaseTimeTo(crowdsaleEndTime + duration.hours(2)).should.be
      .fulfilled

    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.fulfilled
    const balance = await token.balanceOf(beneficiary1).should.be.fulfilled
    balance.should.be.bignumber.equal(1)
  })

  it('should release tokens to the correct owner when calling release', async () => {
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)

    const crowdsaleEndTime = await finishCrowdsale()

    await increaseTimeTo(crowdsaleEndTime + duration.hours(2)).should.be
      .fulfilled

    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.fulfilled

    const balance = await token.balanceOf(beneficiary1).should.be.fulfilled

    balance.should.be.bignumber.equal(1)
  })

  it('should release tokens to the correct owner when calling releaseTokensByAddress', async () => {
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)

    const crowdsaleEndTime = await finishCrowdsale()

    await increaseTimeTo(crowdsaleEndTime + duration.hours(2)).should.be
      .fulfilled

    await tokenLock.releaseTokensByAddress(beneficiary1, { from: owner }).should
      .be.fulfilled

    const balance = await token.balanceOf(beneficiary1).should.be.fulfilled

    balance.should.be.bignumber.equal(1)
  })

  it('should wait until lock duration is completed before releasing tokens', async () => {
    const crowdsaleEndTime = await finishCrowdsale()
    await mintAllowAndLockTokens(beneficiary1, duration.hours(3), 3)
    await mintAllowAndLockTokens(beneficiary1, duration.hours(6), 6)

    await tokenLock.releaseTokens({ from: beneficiary1 })
    let lock1 = await tokenLock.getLockByIndex(beneficiary1, 0)
    let lock2 = await tokenLock.getLockByIndex(beneficiary1, 1)
    lock1[2].should.be.false
    lock2[2].should.be.false
    let balance = await token.balanceOf(beneficiary1).should.be.fulfilled
    balance.should.be.bignumber.equal(0)

    await increaseTimeTo(crowdsaleEndTime + duration.hours(4)).should.be
      .fulfilled
    await tokenLock.releaseTokens({ from: beneficiary1 })
    lock1 = await tokenLock.getLockByIndex(beneficiary1, 0)
    lock2 = await tokenLock.getLockByIndex(beneficiary1, 1)
    lock1[2].should.be.true
    lock2[2].should.be.false
    balance = await token.balanceOf(beneficiary1).should.be.fulfilled
    balance.should.be.bignumber.equal(3)

    await tokenLock.releaseTokens({ from: beneficiary1 })
    await tokenLock.releaseTokens({ from: beneficiary1 })
    lock2 = await tokenLock.getLockByIndex(beneficiary1, 1)
    lock2[2].should.be.false

    await increaseTimeTo(crowdsaleEndTime + duration.hours(8)).should.be
      .fulfilled
    await tokenLock.releaseTokens({ from: beneficiary1 })

    // After all locks have been released, the lock is deleted.
    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.rejected
    balance = await token.balanceOf(beneficiary1).should.be.fulfilled
    balance.should.be.bignumber.equal(9)
  })

  it('should reject if a beneficiary has no locks', async () => {
    await mintAndAllow(1)
    await finishCrowdsaleAndIncreaseTimeTo(duration.hours(2))

    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.rejected

    await lockTokens(beneficiary1, duration.hours(1), 1)
    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.fulfilled
    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.rejected

    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)
    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.fulfilled
    await tokenLock.releaseTokens({ from: beneficiary1 }).should.be.rejected
  })

  it('should only allow the owner to call releaseTokensByAddress', async () => {
    await mintAllowAndLockTokens(beneficiary1, duration.hours(1), 1)
    await finishCrowdsaleAndIncreaseTimeTo(duration.hours(2))
    await tokenLock.releaseTokensByAddress(beneficiary1, { from: notOwner })
      .should.be.rejected
  })

  xit('gas consumption in a real world scenario', async () => {
    const totalAccounts = 10
    const chunkSize = totalAccounts / 2

    for (let i = 0; i < totalAccounts; i++) {
      await mintAllowAndLockTokens(accounts[i], duration.weeks(1), 1600000)
      await mintAllowAndLockTokens(accounts[i], duration.weeks(4), 1600000)
      await mintAllowAndLockTokens(accounts[i], duration.weeks(8), 1600000)
    }

    await totalTokensLockedShouldBe(totalAccounts * 1600000 * 3)

    await finishCrowdsaleAndIncreaseTimeTo(duration.weeks(1))

    for (let i = 0; i <= totalAccounts - chunkSize; i += chunkSize) {
      await addressBalanceShouldBe(accounts[i], 4800000)
      await releaseTokenRange(i, i + chunkSize)
    }

    await increaseTimeTo(latestTime() + duration.weeks(4))

    for (let i = 0; i < totalAccounts; i++) {
      await addressBalanceShouldBe(accounts[i], 3200000)
      await releaseTokens(accounts[i])
    }

    await increaseTimeTo(latestTime() + duration.weeks(4))

    for (let i = 0; i <= totalAccounts - chunkSize; i += chunkSize) {
      await addressBalanceShouldBe(accounts[i], 1600000)
      await releaseTokenRange(i, i + chunkSize)
      await addressBalanceShouldBe(accounts[i], 0)
    }

    await totalTokensLockedShouldBe(0)

    console.info(
      `Total gas used for ${totalAccounts} accounts with 3 vesting periods: ${totalGas}`
    )
  })
})
