const OMIToken = artifacts.require('OMIToken')
const OMITokenLock = artifacts.require('OMITokenLock')
const OMICrowsdale = artifacts.require('OMICrowdsale')
const { ether } = require('./helpers/ether')
const { getUSDPerETH, getWEIPerOMI } = require('./helpers/omi')
const { duration, increaseTimeTo } = require('./helpers/increaseTime')
const { latestTime } = require('./helpers/latestTime')

const got = require('got')

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('OMICrowsdale', accounts => {
  let token
  let tokenLock
  let crowdsale
  const initialRate = 10000
  const ETHWallet = accounts[0]
  const owner = accounts[1]
  const notOwner = accounts[2]
  const whitelisted1 = accounts[3]
  const whitelisted2 = accounts[4]
  const whitelisted3 = accounts[5]
  const whitelisted4 = accounts[6]
  const notWhitelisted1 = accounts[7]
  const notWhitelisted2 = accounts[8]

  const crowdsaleStartTime = 1530316800
  const crowdsaleFinishTime = 1538351999
  const crowdsaleUSDGoal = 44625000
  const crowdsaleTokenGoal = 362500000
  const minimumTokenPurchase = 2500
  const maximumTokenPurchase = 1000000

  const rate = num => new BigNumber(num)

  const shouldFulfillPurchase = async (from, value) =>
    await crowdsale.buyTokens(from, { value, from }).should.be.fulfilled

  const shouldRejectPurchase = async (from, value) => {
    await crowdsale.buyTokens(from, { value, from }).should.be.rejected
  }

  const setupContracts = async () => {
    token = await OMIToken.new({ from: owner })
    tokenLock = await OMITokenLock.new(token.address, { from: owner })
    crowdsale = await OMICrowsdale.new(
      initialRate,
      ETHWallet,
      token.address,
      tokenLock.address,
      { from: owner }
    )
    await tokenLock.setCrowdsaleAddress(crowdsale.address, { from: owner })
    await tokenLock.setAllowanceAddress(ETHWallet, { from: owner })
    await crowdsale.addToWhitelist(whitelisted1, { from: owner })
    await crowdsale.addToWhitelist(whitelisted2, { from: owner })
    await crowdsale.addToWhitelist(whitelisted3, { from: owner })
    await crowdsale.addToWhitelist(whitelisted4, { from: owner })

    await token.mint(ETHWallet, 500000000, { from: owner })
    await token.approve(tokenLock.address, 500000000, { from: ETHWallet })
  }

  describe('Basic Functions', () => {
    beforeEach(setupContracts)

    describe('Settings', () => {
      it('should have the correct owners and addresses', async () => {
        const crowdsaleETHWallet = await crowdsale.wallet()
        crowdsaleETHWallet.should.equal(accounts[0])

        const crowdsaleTokenAddress = await crowdsale.token()
        crowdsaleTokenAddress.should.equal(token.address)

        const crowdsaleTokenLockAddress = await crowdsale.tokenLock()
        crowdsaleTokenLockAddress.should.equal(tokenLock.address)

        const crowdsaleOwner = await crowdsale.owner()
        crowdsaleOwner.should.equal(accounts[1])

        const tokenOwner = await token.owner()
        tokenOwner.should.equal(crowdsaleOwner)

        const tokenLockOwner = await tokenLock.owner()
        tokenLockOwner.should.equal(crowdsaleOwner)

        const tokenLockTokenAddress = await tokenLock.token()
        tokenLockTokenAddress.should.equal(crowdsaleTokenAddress)
      })
    })

    describe('Token Rate', () => {
      it('should allow the rate to be updated', async () => {
        const rateBefore = await crowdsale.rate()
        rateBefore.should.be.bignumber.equal(rate(10000))

        await crowdsale.setRate(rate(12000), { from: owner })
        const rateAfter = await crowdsale.rate()
        rateAfter.should.be.bignumber.equal(rate(12000))
      })

      it('should only allow the owner to update the rate', async () => {
        await crowdsale.setRate(rate(1), { from: notOwner }).should.be.rejected
      })

      it('should not allow rates below zero', async () => {
        await crowdsale.setRate(rate(0), { from: owner }).should.be.rejected
      })

      it('gas usage test', async () => {
        const USDPerETH = await getUSDPerETH()
        const WEIPerOMI = await getWEIPerOMI()

        const response = await crowdsale.setRate(WEIPerOMI, {
          from: owner,
        })
        const gasUsed = response.receipt.gasUsed
        const dailyCost = gasUsed / 10 ** 8 * USDPerETH.toNumber()
        console.log(
          `Setting the rate once per day for 30 days will cost $${dailyCost *
            30} USD.`
        )
      })
    })

    describe('Update USD Raised', () => {
      it('should only allow owners to update the USD raised', async () => {
        await crowdsale.setUSDRaised(new BigNumber(2000000), {
          from: notOwner,
        }).should.be.rejected
      })

      it('should store updated USD amounts', async () => {
        await crowdsale.setUSDRaised(new BigNumber(2000000), {
          from: owner,
        }).should.be.fulfilled

        const USDRaised = await crowdsale.totalUSDRaised()
        USDRaised.should.be.bignumber.equal(2000000)
      })
    })

    describe('Pausable', () => {
      it('should only allow the owner to pause', async () => {
        await crowdsale.pause({ from: notOwner }).should.be.rejected
      })

      it('should only allow the owner to unpause', async () => {
        await crowdsale.pause({ from: owner }).should.be.fulfilled
        await crowdsale.unpause({ from: notOwner }).should.be.rejected
      })

      it('should not pause if already paused', async () => {
        await crowdsale.pause({ from: owner }).should.be.fulfilled
        await crowdsale.pause({ from: owner }).should.be.rejected
      })

      it('should not unpause if already unpaused', async () => {
        await crowdsale.unpause({ from: owner }).should.be.rejected
      })
    })

    describe('Whitelist', () => {
      it('should only allow owner to add accounts', async () => {
        await crowdsale.addToWhitelist(notWhitelisted1, { from: notOwner })
          .should.be.rejected
      })

      it('should be able to add accounts', async () => {
        let isWhitelisted = await crowdsale.whitelist(notWhitelisted1)
        isWhitelisted.should.be.false
        await crowdsale.addToWhitelist(notWhitelisted1, { from: owner }).should
          .be.fulfilled
        isWhitelisted = await crowdsale.whitelist(notWhitelisted1)
        isWhitelisted.should.be.true
      })

      it('should only allow owner to add many accounts at once', async () => {
        await crowdsale.addManyToWhitelist([notWhitelisted1, notWhitelisted2], {
          from: notOwner,
        }).should.be.rejected
      })

      it('should be able to add many accounts at once', async () => {
        await crowdsale.addManyToWhitelist([notWhitelisted1, notWhitelisted2], {
          from: owner,
        }).should.be.fulfilled
        isWhitelisted = await crowdsale.whitelist(notWhitelisted1)
        isWhitelisted.should.be.true
        isWhitelisted = await crowdsale.whitelist(notWhitelisted2)
        isWhitelisted.should.be.true
      })

      it('should only allow owner to remove accounts', async () => {
        await crowdsale.removeFromWhitelist(whitelisted1, { from: notOwner })
          .should.be.rejected
      })

      it('should be able to remove accounts', async () => {
        await crowdsale.removeFromWhitelist(whitelisted1, { from: owner })
          .should.be.fulfilled
      })
    })
  })

  describe('Main Crowdsale', () => {
    before(async () => {
      await setupContracts()
    })

    it('should not allow purchases before the crowdsale start time', async () => {
      const currentRate = await crowdsale.rate()
      await shouldRejectPurchase(
        whitelisted1,
        currentRate.times(minimumTokenPurchase)
      )

      await increaseTimeTo(crowdsaleStartTime)
      await shouldFulfillPurchase(
        whitelisted1,
        currentRate.times(minimumTokenPurchase)
      )
    })

    describe('Token Lock', () => {
      it('should create one token lock for each purchase', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(new BigNumber(minimumTokenPurchase))

        // Should have one purchase from the previous test
        let numberOfLocks = await tokenLock.getNumberOfLocks(whitelisted1)
        numberOfLocks.should.be.bignumber.equal(1)

        await shouldFulfillPurchase(whitelisted1, value)
        numberOfLocks = await tokenLock.getNumberOfLocks(whitelisted1)
        numberOfLocks.should.be.bignumber.equal(2)
      })

      it('should set the token locks to 7 days duration', async () => {
        const lock1 = await tokenLock.getLockByIndex(whitelisted1, 0)
        const lock2 = await tokenLock.getLockByIndex(whitelisted1, 1)
        lock1[1].should.be.bignumber.equal(duration.days(7))
        lock2[1].should.be.bignumber.equal(duration.days(7))
      })

      it('should lock all of the tokens purchased', async () => {
        const lock1 = await tokenLock.getLockByIndex(whitelisted1, 0)
        lock1[0].should.be.bignumber.equal(minimumTokenPurchase)
        const lock2 = await tokenLock.getLockByIndex(whitelisted1, 1)
        lock2[0].should.be.bignumber.equal(minimumTokenPurchase)
      })
    })

    describe('Purchase Tracking', () => {
      it('should keep a running total for transactions', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(minimumTokenPurchase)

        let purchaseRecord = await crowdsale.getPurchaseRecord(whitelisted2)
          .should.be.fulfilled
        purchaseRecord.should.be.bignumber.equal(0)

        await shouldFulfillPurchase(whitelisted2, value)

        purchaseRecord = await crowdsale.getPurchaseRecord(whitelisted2).should
          .be.fulfilled
        purchaseRecord.should.be.bignumber.equal(2500)

        await shouldFulfillPurchase(whitelisted2, value)

        purchaseRecord = await crowdsale.getPurchaseRecord(whitelisted2).should
          .be.fulfilled
        purchaseRecord.should.be.bignumber.equal(5000)
      })
    })

    describe('Payments', () => {
      let currentRate
      let belowMinimumPurchase
      let aboveMaximumPurchase

      const minimumPurchaseAmount = () =>
        currentRate.times(minimumTokenPurchase)

      const maximumPurchaseAmount = () =>
        currentRate.times(maximumTokenPurchase)

      before(async () => {
        currentRate = await crowdsale.rate()
        belowMinimumPurchase = currentRate
          .times(minimumTokenPurchase)
          .minus(currentRate)
        aboveMaximumPurchase = currentRate
          .times(maximumTokenPurchase)
          .plus(currentRate)
      })

      describe('should be accepted', () => {
        it('from whitelisted contributors with the minimum purchase amount before the stage is finished', async () => {
          await shouldFulfillPurchase(whitelisted1, minimumPurchaseAmount())
        })

        it('from whitelisted contributors with multiple purchases before the stage is finished', async () => {
          await shouldFulfillPurchase(whitelisted1, minimumPurchaseAmount())
          await shouldFulfillPurchase(whitelisted1, minimumPurchaseAmount())
        })

        it('from whitelisted contributors with the maximum purchase amount before the stage is finished', async () => {
          await shouldFulfillPurchase(whitelisted3, maximumPurchaseAmount())
        })
      })

      describe('should be rejected', () => {
        it('when paused', async () => {
          await crowdsale.pause({ from: owner }).should.be.fulfilled
          await shouldRejectPurchase(whitelisted4, minimumPurchaseAmount())
        })

        it('when contribution is below the minimum requirement', async () => {
          await shouldRejectPurchase(whitelisted4, belowMinimumPurchase)
        })

        it('when contribution is above the maximum requirement', async () => {
          await shouldRejectPurchase(whitelisted4, aboveMaximumPurchase)
        })

        it('when contributor is different from beneficiary', async () => {
          await crowdsale.buyTokens(whitelisted2, {
            value: minimumPurchaseAmount(),
            from: whitelisted1,
          }).should.be.rejected
        })
      })
    })

    describe('End of Crowdsale', () => {
      beforeEach(async () => {
        await setupContracts()
      })

      it('should finish the crowdsale if the USD raised hits the funding goal', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(new BigNumber(minimumTokenPurchase))

        await crowdsale.setUSDRaised(new BigNumber(44625000), { from: owner })
          .should.be.fulfilled

        // Make a purchase to finalize the crowdsale
        await shouldFulfillPurchase(whitelisted1, value)

        const isFinalized = await crowdsale.isFinalized()
        isFinalized.should.be.true

        await shouldRejectPurchase(whitelisted1, value)
      })

      // To run this test, change the mainCrowdsale token goal and run it individually
      xit('should finish the crowdsale if the token goal is met', async () => {
        const currentRate = await crowdsale.rate()
        // The number of tokens should be <= the number of tokens left
        const value = currentRate.times(new BigNumber(999000))

        // Make a purchase to finalize the crowdsale
        await shouldFulfillPurchase(whitelisted1, value)

        const isFinalized = await crowdsale.isFinalized()
        isFinalized.should.be.true

        await shouldRejectPurchase(whitelisted1, value)
      })

      it('should finish the crowdsale if the time is past the end time', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(new BigNumber(minimumTokenPurchase))

        await increaseTimeTo(1538351999)

        // Make a purchase to finalize the crowdsale
        await shouldFulfillPurchase(whitelisted1, value)

        const isFinalized = await crowdsale.isFinalized()
        isFinalized.should.be.true

        await shouldRejectPurchase(whitelisted1, value)
      })
    })
  })
})
