const got = require('got')
const BigNumber = require('bignumber.js')

const OMItoUSDRate = new BigNumber(0.05)

const getETHtoUSDRate = async () => {
  const response = await got(
    'https://min-api.cryptocompare.com/data/dayAvg?fsym=ETH&tsym=USD',
    {
      json: true
    }
  )
  return new BigNumber(response.body.USD)
}

const getWEItoMOMIRate = async ETHtoUSD => {
  const ETHtoUSDRate = ETHtoUSD
    ? new BigNumber(ETHtoUSD)
    : await getETHtoUSDRate()
  return ETHtoUSDRate.dividedBy(OMItoUSDRate)
}

module.exports = {
  getETHtoUSDRate,
  getWEItoMOMIRate
}
