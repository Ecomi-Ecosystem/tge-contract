const { getETHtoOMIRate, getETHtoUSDRate, getWEItoMOMIRate } = require('./omi')

const run = async () => {
  const WEItoMOMIRate = await getWEItoMOMIRate()
  console.log('1 WEI can purchase:', WEItoMOMIRate.times(1).toNumber(), 'mOMI.')
}

run()
