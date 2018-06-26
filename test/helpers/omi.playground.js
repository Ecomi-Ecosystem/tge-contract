const { getWEItoMOMIRate } = require('./omi')

const run = async () => {
  const WEItoMOMIRate = await getWEItoMOMIRate()
  const WEIAmount = 1
  const OMIAmount = WEItoMOMIRate.times(WEIAmount).toFixed(0)

  // Since WEI and mOMI have the same number of decimals, the amounts are the same for WEI/mOMI and ETH/OMI.
  console.log(`${WEIAmount} WEI can purchase: ${OMIAmount} mOMI.`)
  console.log(`${WEIAmount} ETH can purchase: ${OMIAmount} OMI.`)
}

run()
