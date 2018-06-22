const { getWEItoMOMIRate } = require('./omi')

const run = async () => {
  const WEItoMOMIRate = await getWEItoMOMIRate()
  const amount = WEItoMOMIRate.times(1).toNumber()

  // Since WEI and mOMI have the same number of decimals, the amounts are the same for WEI/mOMI and ETH/OMI.
  console.log(`1 WEI can purchase: ${amount} mOMI.`)
  console.log(`1 ETH can purchase: ${amount} OMI.`)
}

run()
