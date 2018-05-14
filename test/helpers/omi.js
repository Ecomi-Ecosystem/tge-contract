const got = require('got')
// const BigNumber = require('bignumber.js')
const BigNumber = web3.BigNumber

const USDPerOMI = new BigNumber(0.1)
const WEIPerETH = new BigNumber(10 ** 8)

const getUSDPerETH = async () => {
  const response = await got(
    'https://min-api.cryptocompare.com/data/dayAvg?fsym=ETH&tsym=USD',
    {
      json: true,
    }
  )
  return new BigNumber(response.body.USD)
}

const getWEIPerOMI = async () => {
  const USDPerETH = await getUSDPerETH()
  return USDPerOMI.dividedBy(USDPerETH).times(WEIPerETH)
}

const WEIToOMI = async WEI => {
  const WEIPerOMI = await getWEIPerOMI()
  return new BigNumber(WEI).dividedBy(WEIPerOMI)
}

const OMIToWEI = async OMI => {
  const WEIPerOMI = await getWEIPerOMI()
  return new BigNumber(OMI).times(WEIPerOMI)
}

const OMIToUSD = OMI => new BigNumber(OMI).times(USDPerOMI)

const USDToOMI = USD => new BigNumber(USD).dividedBy(USDPerOMI)

const ETHToOMI = async ETH => {
  const WEIPerOMI = await getWEIPerOMI()
  return new BigNumber(ETH).times(WEIPerETH).dividedBy(WEIPerOMI)
}

const OMIToETH = async OMI => {
  const WEIPerOMI = await getWEIPerOMI()
  return new BigNumber(OMI).times(WEIPerOMI).dividedBy(WEIPerETH)
}

module.exports = {
  getUSDPerETH,
  getWEIPerOMI,
  WEIToOMI,
  OMIToWEI,
  OMIToUSD,
  USDToOMI,
  OMIToETH,
  ETHToOMI,
}
