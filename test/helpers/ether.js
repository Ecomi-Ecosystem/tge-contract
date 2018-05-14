module.exports = {
  ether: n => {
    return new web3.BigNumber(n * 10 ** 8)
  },
}
