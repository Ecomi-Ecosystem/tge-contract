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
  const notWhitelisted1 = accounts[6]
  const notWhitelisted2 = accounts[7]
  const stageConfigurations = {
    preSale1: {
      discountPercentage: 40,
      minimumTokenPurchase: 25000,
      maximumTokenPurchase: 5000000,
      maximumTokenTotal: 50000000,
      currentTokenTotal: 0,
    },
    preSale2: {
      discountPercentage: 30,
      minimumTokenPurchase: 25000,
      maximumTokenPurchase: 5000000,
      maximumTokenTotal: 50000000,
      currentTokenTotal: 0,
    },
    mainCrowdsale: {
      discountPercentage: 0,
      minimumTokenPurchase: 2500,
      maximumTokenPurchase: 1000000,
      maximumTokenTotal: 362500000,
      currentTokenTotal: 0,
    },
  }

  const rate = num => new BigNumber(num)

  const applyDiscount = (currentStageName, rate) =>
    rate.minus(
      rate
        .times(stageConfigurations[currentStageName].discountPercentage)
        .dividedBy(100)
    )

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

      it('should have the correct stage configuration', async () => {
        for (let i = 0; i < Object.keys(stageConfigurations).length; i++) {
          const currentStageName = Object.keys(stageConfigurations)[i]
          const data = await crowdsale.stages(i)
          for (let j = 0; j < data.length; j++) {
            const currentAttributeName = Object.keys(
              stageConfigurations[currentStageName]
            )[j]
            data[j].should.be.bignumber.equal(
              stageConfigurations[currentStageName][currentAttributeName]
            )
          }
        }
        await crowdsale.stages(3).should.be.rejected
      })
    })

    describe('Token Rate', () => {
      it('should allow the rate to be updated on presale 1', async () => {
        const rateBefore = await crowdsale.rate()
        rateBefore.should.be.bignumber.equal(
          applyDiscount('preSale1', rate(10000))
        )

        await crowdsale.setRate(rate(12000), { from: owner })
        const rateAfter = await crowdsale.rate()
        rateAfter.should.be.bignumber.equal(
          applyDiscount('preSale1', rate(12000))
        )
      })

      it('should allow the rate to be updated on presale 2', async () => {
        await advanceToStage('preSale2', 1)

        const rateBefore = await crowdsale.rate()
        rateBefore.should.be.bignumber.equal(
          applyDiscount('preSale2', rate(10000))
        )

        await crowdsale.setRate(rate(12000), { from: owner })
        const rateAfter = await crowdsale.rate()
        rateAfter.should.be.bignumber.equal(
          applyDiscount('preSale2', rate(12000))
        )
      })

      it('should allow the rate to be updated on main crowdsale', async () => {
        await advanceToStage('mainCrowdsale', 2)

        const rateBefore = await crowdsale.rate()
        rateBefore.should.be.bignumber.equal(
          applyDiscount('mainCrowdsale', rate(10000))
        )

        await crowdsale.setRate(rate(12000), { from: owner })
        const rateAfter = await crowdsale.rate()
        rateAfter.should.be.bignumber.equal(
          applyDiscount('mainCrowdsale', rate(12000))
        )
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

      it('should not be able to purchase while paused', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(
          stageConfigurations['preSale1'].minimumTokenPurchase
        )

        await crowdsale.sendTransaction({
          value,
          from: whitelisted1,
        }).should.be.fulfilled
        await crowdsale.buyTokens(whitelisted1, {
          value,
          from: whitelisted1,
        }).should.be.fulfilled

        await crowdsale.pause({ from: owner }).should.be.fulfilled
        await crowdsale.sendTransaction({
          value,
          from: whitelisted1,
        }).should.be.rejected
        await crowdsale.buyTokens(whitelisted1, {
          value,
          from: whitelisted1,
        }).should.be.rejected
      })
    })

    describe('Whitelist', () => {
      it('should not allow non-whitelisted accounts to purchase', async () => {
        await crowdsale.sendTransaction({
          value: ether(1),
          from: notWhitelisted1,
        }).should.be.rejected
      })

      it('should only allow owner to add accounts', async () => {
        await crowdsale.addToWhitelist(notWhitelisted1, { from: notOwner })
          .should.be.rejected
      })

      it('should be able to add accounts', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(
          stageConfigurations['preSale1'].minimumTokenPurchase
        )
        await crowdsale.addToWhitelist(notWhitelisted1, { from: owner }).should
          .be.fulfilled
        await crowdsale.sendTransaction({
          value,
          from: notWhitelisted1,
        }).should.be.fulfilled
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

    describe('Purchase Tracking', () => {
      it('should keep a running total for transactions in each stage', async () => {
        const currentRate = await crowdsale.rate()
        let purchaseRecord = await crowdsale.getPurchaseRecords(whitelisted1)
          .should.be.fulfilled
        purchaseRecord.length.should.equal(3)
        purchaseRecord[0].should.be.bignumber.equal(0)
        purchaseRecord[0].should.be.bignumber.equal(0)
        purchaseRecord[0].should.be.bignumber.equal(0)

        await crowdsale.sendTransaction({
          value: currentRate.times(
            stageConfigurations['preSale1'].minimumTokenPurchase
          ),
          from: whitelisted1,
        }).should.be.fulfilled

        purchaseRecord = await crowdsale.getPurchaseRecords(whitelisted1).should
          .be.fulfilled
        purchaseRecord[0].should.be.bignumber.equal(25000)

        await crowdsale.sendTransaction({
          value: currentRate.times(
            stageConfigurations['preSale1'].minimumTokenPurchase
          ),
          from: whitelisted1,
        }).should.be.fulfilled

        purchaseRecord = await crowdsale.getPurchaseRecords(whitelisted1).should
          .be.fulfilled
        purchaseRecord[0].should.be.bignumber.equal(50000)
      })
    })
  })

  const advanceToStage = async (targetStage, targetStageIndex) => {
    let currentStage = await crowdsale.currentStage()
    let i = 10
    let remainingTokens

    const getRemainingTokens = async currentStageIndex => {
      const currentTokenAmount = await crowdsale.getTokensSold(
        currentStageIndex
      )
      const { maximumTokenTotal } = stageConfigurations[
        Object.keys(stageConfigurations)[currentStage.toNumber()]
      ]
      return new BigNumber(maximumTokenTotal).minus(currentTokenAmount)
    }

    while (currentStage.toNumber() !== targetStageIndex) {
      const { maximumTokenPurchase } = stageConfigurations[
        Object.keys(stageConfigurations)[currentStage.toNumber()]
      ]

      remainingTokens = await getRemainingTokens(currentStage)
      if (remainingTokens.toNumber() < maximumTokenPurchase) break

      const currentRate = await crowdsale.rate()
      await crowdsale.addToWhitelist(accounts[i], { from: owner })
      await crowdsale.sendTransaction({
        value: currentRate.times(new BigNumber(maximumTokenPurchase)),
        from: accounts[i],
      })

      currentStage = await crowdsale.currentStage()
      i++
    }

    // make the last transaction for any remaining tokens
    currentStage = await crowdsale.currentStage()
    remainingTokens = await getRemainingTokens(currentStage)
    if (
      currentStage.toNumber() !== targetStageIndex &&
      remainingTokens.toNumber() > 0
    ) {
      const currentRate = await crowdsale.rate()
      await crowdsale.sendTransaction({
        value: currentRate.times(remainingTokens),
        from: whitelisted1,
      })
    }

    currentStage = await crowdsale.currentStage()
    currentStage.should.be.bignumber.equal(targetStageIndex)
  }

  const testSettings = ({ currentStageName, currentStageIndex }) => {
    it('should be on the correct stage', async () => {
      const actualCurrentStage = await crowdsale.currentStage()
      actualCurrentStage.should.be.bignumber.equal(currentStageIndex)
    })

    it('should have the appropriate discount applied', async () => {
      await crowdsale.setRate(rate(10), { from: owner })
      const newRate = await crowdsale.rate()
      newRate.should.be.bignumber.equal(
        applyDiscount(currentStageName, rate(10))
      )
    })
  }

  const testTokenLock = ({ currentStageName }) => {
    const { minimumTokenPurchase } = stageConfigurations[currentStageName]

    if (currentStageName === 'preSale1' || currentStageName === 'preSale2') {
      it('should create three token locks for each purchase', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(new BigNumber(minimumTokenPurchase))

        await shouldFulfillPurchase(whitelisted1, value)
        let numberOfLocks = await tokenLock.getNumberOfLocks(whitelisted1)
        numberOfLocks.should.be.bignumber.equal(3)

        await shouldFulfillPurchase(whitelisted1, value)
        numberOfLocks = await tokenLock.getNumberOfLocks(whitelisted1)
        numberOfLocks.should.be.bignumber.equal(6)
      })

      it('should set the token locks to 30, 60, and 90 days duration', async () => {
        const lock1 = await tokenLock.getLockByIndex(whitelisted1, 0)
        const lock2 = await tokenLock.getLockByIndex(whitelisted1, 1)
        const lock3 = await tokenLock.getLockByIndex(whitelisted1, 2)
        lock1[1].should.be.bignumber.equal(duration.days(30))
        lock2[1].should.be.bignumber.equal(duration.days(60))
        lock3[1].should.be.bignumber.equal(duration.days(90))
      })

      it('should lock all of the tokens purchased', async () => {
        const lock1 = await tokenLock.getLockByIndex(whitelisted1, 0)
        const lock2 = await tokenLock.getLockByIndex(whitelisted1, 1)
        const lock3 = await tokenLock.getLockByIndex(whitelisted1, 2)
        const totalTokensLocked = lock1[0].plus(lock2[0].plus(lock3[0]))
        totalTokensLocked.should.be.bignumber.equal(minimumTokenPurchase)
      })
    }

    if (currentStageName === 'mainCrowdsale') {
      it('should create one token lock for each purchase', async () => {
        const currentRate = await crowdsale.rate()
        const value = currentRate.times(new BigNumber(minimumTokenPurchase))

        // From previous test
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
    }
  }

  const testPayments = ({ currentStageName }) => {
    let minimumTokenPurchase
    let maximumTokenPurchase
    let currentRate
    let acceptableValue
    let belowMinimumPurchase
    let aboveMaximumPurchase
    const currentDiscount =
      stageConfigurations[currentStageName].discountPercentage

    const minimumPurchaseAmount = () => currentRate.times(minimumTokenPurchase)

    const maximumPurchaseAmount = () => currentRate.times(maximumTokenPurchase)

    before(async () => {
      currentRate = await crowdsale.rate()
      minimumTokenPurchase = new BigNumber(
        stageConfigurations[currentStageName].minimumTokenPurchase
      )
      maximumTokenPurchase = new BigNumber(
        stageConfigurations[currentStageName].maximumTokenPurchase
      )
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
        await shouldFulfillPurchase(whitelisted2, maximumPurchaseAmount())
      })
    })

    describe('should be rejected', () => {
      it('when paused', async () => {
        await crowdsale.pause({ from: owner }).should.be.fulfilled
        await shouldRejectPurchase(whitelisted3, minimumPurchaseAmount())
      })

      it('when contribution is below the minimum requirement', async () => {
        await shouldRejectPurchase(whitelisted3, belowMinimumPurchase)
      })

      it('when contribution is above the maximum requirement', async () => {
        await shouldRejectPurchase(whitelisted3, aboveMaximumPurchase)
      })

      it('when contributor is different from beneficiary', async () => {
        await crowdsale.buyTokens(whitelisted2, {
          value: minimumPurchaseAmount(),
          from: whitelisted1,
        }).should.be.rejected
      })
    })
  }

  describe('Presale 1', () => {
    const currentStageName = 'preSale1'

    before(setupContracts)

    describe(
      'Settings',
      testSettings.bind(null, { currentStageName, currentStageIndex: 0 })
    )

    describe('Token Lock', testTokenLock.bind(null, { currentStageName }))

    describe('Payments', testPayments.bind(null, { currentStageName }))
  })

  describe('Presale 2', () => {
    const currentStageName = 'preSale2'
    const currentStageIndex = 1

    before(async () => {
      await setupContracts()
      await advanceToStage(currentStageName, currentStageIndex)
    })

    describe(
      'Settings',
      testSettings.bind(null, { currentStageName, currentStageIndex })
    )

    describe('Token Lock', testTokenLock.bind(null, { currentStageName }))

    describe('Payments', testPayments.bind(null, { currentStageName }))
  })

  describe('Main Crowdsale', () => {
    const currentStageName = 'mainCrowdsale'
    const currentStageIndex = 2

    before(async () => {
      await setupContracts()
      await advanceToStage(currentStageName, currentStageIndex)
    })

    it('should not allow purchases before the crowdsale start time', async () => {
      const currentRate = await crowdsale.rate()
      const minimumTokenPurchase = new BigNumber(
        stageConfigurations[currentStageName].minimumTokenPurchase
      )
      await shouldRejectPurchase(
        whitelisted1,
        currentRate.times(minimumTokenPurchase)
      )
      await increaseTimeTo(1530316800)
      await shouldFulfillPurchase(
        whitelisted1,
        currentRate.times(minimumTokenPurchase)
      )
    })

    describe(
      'Settings',
      testSettings.bind(null, { currentStageName, currentStageIndex })
    )

    describe('Token Lock', testTokenLock.bind(null, { currentStageName }))

    describe('Payments', testPayments.bind(null, { currentStageName }))
  })

  // This is time bound to the above test
  describe('End of Crowdsale', () => {
    beforeEach(async () => {
      await setupContracts()

      // Make a purchase to automatically advance to the main crowdsale
      const { minimumTokenPurchase } = stageConfigurations['preSale1']
      const currentRate = await crowdsale.rate()
      const value = currentRate.times(new BigNumber(minimumTokenPurchase))
      await shouldFulfillPurchase(whitelisted1, value)
    })

    it('should automatically advance to the crowdsale if time is after start time', async () => {
      const currentStage = await crowdsale.currentStage()
      currentStage.should.be.bignumber.equal(2)
    })

    it('should finish the crowdsale if the USD raised hits the funding goal', async () => {
      const { minimumTokenPurchase } = stageConfigurations['mainCrowdsale']
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
      const { maximumTokenPurchase } = stageConfigurations['mainCrowdsale']
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
      const { minimumTokenPurchase } = stageConfigurations['mainCrowdsale']
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
