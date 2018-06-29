const { getWEItoMOMIRate, getETHtoUSDRate } = require('./omi')
const BigNumber = require('bignumber.js')

const run = async () => {
  const ETHtoUSDRate = await getETHtoUSDRate()
  // const ETHtoUSDRate = 800
  const WEItoMOMIRate = await getWEItoMOMIRate(ETHtoUSDRate)
  const WEIAmount = 1
  const OMIAmount = WEItoMOMIRate.times(WEIAmount).toFixed(0)
  const maximumOMIPurchase = 5000000
  const maximumETHPurchase = new BigNumber(maximumOMIPurchase)
    .dividedBy(WEItoMOMIRate)
    .toFixed(8)
  const maximumUSDPurchase = new BigNumber(maximumETHPurchase)
    .times(ETHtoUSDRate)
    .toFixed(2)

  // Since WEI and mOMI have the same number of decimals, the amounts are the same for WEI/mOMI and ETH/OMI.
  console.log(`${WEIAmount} WEI can purchase: ${OMIAmount} mOMI.`)
  console.log(`${WEIAmount} ETH can purchase: ${OMIAmount} OMI.`)
  console.log(`The current ETH/USD rate is: ${ETHtoUSDRate}`)
  console.log(`Maximum OMI purchase: ${maximumOMIPurchase}`)
  console.log(`Maximum ETH purchase: ${maximumETHPurchase}`)
  console.log(`Maximum USD purchase: ${maximumUSDPurchase}`)
}

run()
