const {
  WEIToOMI,
  OMIToWEI,
  OMIToUSD,
  USDToOMI,
  OMIToETH,
  ETHToOMI,
} = require('./omi')

test('WEIToOMI', async () => {
  const amountOfWEI = 1
  const amountOfOMI = await WEIToOMI(amountOfWEI)
  console.log(`${amountOfWEI} WEI = ${amountOfOMI.toNumber()} OMI`)
})

test('OMIToWEI', async () => {
  const amountOfOMI = 1
  const amountOfWEI = await OMIToWEI(amountOfOMI)
  console.log(`${amountOfOMI} OMI = ${amountOfWEI.toNumber()} WEI`)
})

test('ETHToOMI', async () => {
  const amountOfETH = 1
  const amountOfOMI = await ETHToOMI(amountOfETH)
  console.log(`${amountOfETH} ETH = ${amountOfOMI.toNumber()} OMI`)
})

test('OMIToETH', async () => {
  const amountOfOMI = 1
  const amountOfETH = await OMIToETH(amountOfOMI)
  console.log(`${amountOfOMI} OMI = ${amountOfETH.toNumber()} ETH`)
})
