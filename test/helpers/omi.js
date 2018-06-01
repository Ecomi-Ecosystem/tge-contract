const got = require('got')
// const BigNumber = require('bignumber.js')
const BigNumber = web3.BigNumber

const OMItoUSDRate = new BigNumber(0.1)
const WEItoETHRate = new BigNumber(1e-18)
const mOMItoOMIRate = new BigNumber(1e-18)

const getETHtoUSDRate = async () => {
  const response = await got(
    'https://min-api.cryptocompare.com/data/dayAvg?fsym=ETH&tsym=USD',
    {
      json: true,
    }
  )
  return new BigNumber(response.body.USD)
}

const getETHtoOMIRate = async () => {
  const ETHtoUSDRate = await getETHtoUSDRate()
  return ETHtoUSDRate.dividedBy(OMItoUSDRate)
}

const getWEItoMOMIRate = async () => {
  return await getETHtoOMIRate()
}

module.exports = {
  getETHtoUSDRate,
  getETHtoOMIRate,
  getWEItoMOMIRate,
}
