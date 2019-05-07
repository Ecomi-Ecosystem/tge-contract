const OMIToken = artifacts.require('OMIToken')
const OMITokenLock = artifacts.require('OMITokenLock')
const { time } = require('openzeppelin-test-helpers')

const BN = web3.utils.BN
const chai = require('chai')
const expect = chai.expect
chai.use(require('bn-chai')(BN))
chai.use(require('chai-as-promised'))

contract('OMITokenLock', accounts => {
  let token
  let tokenLock
  const owner = accounts[0]
  const notOwner = accounts[1]
  const beneficiary1 = accounts[2]

  beforeEach(async () => {
    token = await OMIToken.new({ from: owner })
    tokenLock = await OMITokenLock.new(token.address, owner, { from: owner })
    await tokenLock.setAllowanceAddress(owner)
  })

  const addressBalanceShouldBe = async (address, amount) => {
    const balance = await tokenLock.getTokenBalance(address)
    expect(balance).to.gte.BN(amount)
  }

  const totalTokensLockedShouldBe = async amount => {
    const balance = await tokenLock.totalTokensLocked()
    expect(balance).to.eq.BN(amount)
  }

  const mintAndAllow = async amount => {
    await expect(token.mint(owner, amount)).to.be.fulfilled
    await expect(
      token.increaseAllowance(tokenLock.address, amount, {
        from: owner,
      })
    ).to.be.fulfilled
  }

  const lockTokens = async (to, startTime, duration, amount) => {
    await expect(
      tokenLock.lockTokens(to, startTime, duration, amount, {
        from: owner,
      })
    ).to.be.fulfilled
  }

  const mintAllowAndLockTokens = async (to, startTime, duration, amount) => {
    await expect(mintAndAllow(amount)).to.be.fulfilled
    await expect(lockTokens(to, startTime, duration, amount)).to.be.fulfilled
  }

  const releaseTokens = async from => {
    await expect(tokenLock.releaseTokens({ from })).to.be.fulfilled
  }

  it('should store an allowance provider', async () => {
    const allowanceProvider = await tokenLock.allowanceProvider()
    expect(allowanceProvider).to.equal(owner)
  })

  it('should keep track of the number of tokens locked', async () => {
    const startTime = await time.latest()
    await totalTokensLockedShouldBe(0)

    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(2),
      3
    )
    await totalTokensLockedShouldBe(3)
    await addressBalanceShouldBe(beneficiary1, 3)

    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(4),
      6
    )
    await totalTokensLockedShouldBe(9)
    await addressBalanceShouldBe(beneficiary1, 9)

    await time.increase(time.duration.hours(3))
    await releaseTokens(beneficiary1)
    await totalTokensLockedShouldBe(6)
    await addressBalanceShouldBe(beneficiary1, 6)

    await time.increase(time.duration.hours(1))
    await releaseTokens(beneficiary1)
    await totalTokensLockedShouldBe(0)
    await addressBalanceShouldBe(beneficiary1, 0)
  })

  it('should be pausable', async () => {
    const startTime = await time.latest()
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      100
    )

    await expect(tokenLock.pause({ from: owner })).to.be.fulfilled

    await mintAndAllow(100)
    await expect(
      tokenLock.lockTokens(
        beneficiary1,
        startTime,
        time.duration.hours(1),
        100,
        {
          from: owner,
        }
      )
    ).to.be.rejected

    await expect(tokenLock.unpause({ from: owner })).to.be.fulfilled

    await time.increase(time.duration.hours(2))

    await expect(tokenLock.pause({ from: owner })).to.be.fulfilled

    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be.rejected

    await expect(tokenLock.unpause({ from: owner })).to.be.fulfilled

    await expect(
      tokenLock.releaseTokensByAddress(beneficiary1, { from: owner })
    ).to.be.fulfilled
  })

  it('should only allow the owner to pause', async () => {
    await expect(tokenLock.pause({ from: notOwner })).to.be.rejected
  })

  it('should keep track of the total amount of locked token for a given address', async () => {
    const startTime = await time.latest()

    await time.increase(time.duration.hours(2))

    let totalTokens = await tokenLock.getTokenBalance(beneficiary1)
    expect(totalTokens).to.eq.BN(0)
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      3
    )
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(3),
      3
    )
    totalTokens = await tokenLock.getTokenBalance(beneficiary1)
    expect(totalTokens).to.eq.BN(6)

    await releaseTokens(beneficiary1)
    totalTokens = await tokenLock.getTokenBalance(beneficiary1)
    expect(totalTokens).to.eq.BN(3)
  })

  it('should only allow locking tokens that have been provided as an allowance to the token lock contract', async () => {
    const startTime = await time.latest()
    await expect(
      tokenLock.lockTokens(beneficiary1, startTime, time.duration.hours(1), 1, {
        from: owner,
      })
    ).to.be.rejected

    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      1
    )

    await expect(
      tokenLock.lockTokens(beneficiary1, startTime, time.duration.hours(1), 1, {
        from: owner,
      })
    ).to.be.rejected

    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      1
    )
  })

  it('should only allow owner to lock tokens', async () => {
    const startTime = await time.latest()
    await mintAndAllow(1)

    await expect(
      tokenLock.lockTokens(beneficiary1, startTime, time.duration.hours(1), 1, {
        from: notOwner,
      })
    ).to.be.rejected

    await lockTokens(beneficiary1, startTime, time.duration.hours(1), 1)
  })

  it('should only allow owner to revoke locked tokens', async () => {
    const startTime = await time.latest()
    await mintAndAllow(1)

    await expect(
      tokenLock.lockTokens(beneficiary1, startTime, time.duration.hours(1), 1, {
        from: owner,
      })
    ).to.be.fulfilled

    await expect(
      tokenLock.revokeLockByIndex(beneficiary1, 0, { from: notOwner })
    ).to.be.rejected
  })

  it('should allow owner to revoke locked tokens', async () => {
    const startTime = await time.latest()
    await mintAndAllow(1)

    await expect(
      tokenLock.lockTokens(beneficiary1, startTime, time.duration.hours(1), 1, {
        from: owner,
      })
    ).to.be.fulfilled

    await expect(tokenLock.revokeLockByIndex(beneficiary1, 0, { from: owner }))
      .to.be.fulfilled

    const lock = await tokenLock.getLockByIndex(beneficiary1, 0)
    expect(lock[3]).to.be.true
  })

  it('should release tokens to the correct owner when calling release', async () => {
    const startTime = await time.latest()
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      1
    )

    await time.increase(time.duration.hours(2))

    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be
      .fulfilled

    const balance = await token.balanceOf(beneficiary1)

    expect(balance).to.eq.BN(1)
  })

  it('should release tokens to the correct owner when calling releaseTokensByAddress', async () => {
    const startTime = await time.latest()
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      1
    )

    await time.increase(time.duration.hours(2))

    await expect(
      tokenLock.releaseTokensByAddress(beneficiary1, { from: owner })
    ).to.be.fulfilled

    const balance = await token.balanceOf(beneficiary1)

    expect(balance).to.eq.BN(1)
  })

  it('should wait until lock duration is completed before releasing tokens', async () => {
    const startTime = await time.latest()
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(3),
      3
    )
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(6),
      6
    )

    await tokenLock.releaseTokens({ from: beneficiary1 })
    let lock1 = await tokenLock.getLockByIndex(beneficiary1, 0)
    expect(lock1[2]).to.be.false

    let lock2 = await tokenLock.getLockByIndex(beneficiary1, 1)
    expect(lock2[2]).to.be.false

    let balance = await token.balanceOf(beneficiary1)
    expect(balance).to.eq.BN(0)

    await time.increase(time.duration.hours(4))
    await tokenLock.releaseTokens({ from: beneficiary1 })
    lock1 = await tokenLock.getLockByIndex(beneficiary1, 0)
    lock2 = await tokenLock.getLockByIndex(beneficiary1, 1)
    expect(lock1[2]).to.be.true
    expect(lock2[2]).to.be.false
    balance = await token.balanceOf(beneficiary1)
    expect(balance).to.eq.BN(3)

    await tokenLock.releaseTokens({ from: beneficiary1 })
    await tokenLock.releaseTokens({ from: beneficiary1 })
    lock2 = await tokenLock.getLockByIndex(beneficiary1, 1)
    expect(lock2[2]).to.be.false

    await time.increase(time.duration.hours(8))
    await tokenLock.releaseTokens({ from: beneficiary1 })

    // After all locks have been released, the lock is deleted.
    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be.rejected
    balance = await token.balanceOf(beneficiary1)
    expect(balance).to.eq.BN(9)
  })

  it('should reject if a beneficiary has no locks', async () => {
    const startTime = await time.latest()
    await mintAndAllow(1)
    await time.increase(time.duration.hours(2))

    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be.rejected

    await lockTokens(beneficiary1, startTime, time.duration.hours(1), 1)
    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be
      .fulfilled
    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be.rejected

    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      1
    )
    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be
      .fulfilled
    await expect(tokenLock.releaseTokens({ from: beneficiary1 })).to.be.rejected
  })

  it('should only allow the owner to call releaseTokensByAddress', async () => {
    const startTime = await time.latest()
    await mintAllowAndLockTokens(
      beneficiary1,
      startTime,
      time.duration.hours(1),
      1
    )
    await time.increase(time.duration.hours(2))
    await expect(
      tokenLock.releaseTokensByAddress(beneficiary1, { from: notOwner })
    ).to.be.rejected
  })
})
