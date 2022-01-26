import { NETWORK_CHAIN_ID } from 'connectors'
import { ERC20_ABI } from 'constants/abis/erc20'
import { abi as masterchefABI } from 'constants/abis/master-chef-contract.json'
import { BIG_TEN, BIG_ZERO, BIG_ONE, SerializedBigNumber } from 'constants/types'
import BigNumber from 'bignumber.js'
import { getMasterChefAddress } from 'utils/addressHelper'
import multicall from 'utils/multicall'
import { SerializedFarm } from './types'

type PublicFarmData = {
  tokenAmountTotal: SerializedBigNumber
  lpTotalInQuoteToken: SerializedBigNumber
  lpTotalSupply: SerializedBigNumber
  tokenPriceVsQuote: SerializedBigNumber
  poolWeight: SerializedBigNumber
  multiplier: string
}

const fetchFarm = async (farm: SerializedFarm): Promise<PublicFarmData> => {
  const { pid, lpAddresses, baseToken, quoteToken } = farm
  const lpAddress = lpAddresses
  const calls = [
    // Balance of token in the LP contract
    {
      address: baseToken.address,
      name: 'balanceOf',
      params: [lpAddress]
    },
    // Balance of quote token on LP contract
    {
      address: quoteToken.address,
      name: 'balanceOf',
      params: [lpAddress]
    },
    // Balance of LP tokens in the master chef contract
    {
      address: lpAddress,
      name: 'balanceOf',
      params: [getMasterChefAddress(NETWORK_CHAIN_ID)]
    },
    // Total supply of LP tokens
    {
      address: lpAddress,
      name: 'totalSupply'
    },
    // Token decimals
    {
      address: baseToken.address,
      name: 'decimals'
    },
    // Quote token decimals
    {
      address: quoteToken.address,
      name: 'decimals'
    }
  ]

  const [
    tokenBalanceLP,
    quoteTokenBalanceLP,
    lpTokenBalanceMC,
    lpTotalSupply,
    tokenDecimals,
    quoteTokenDecimals
  ] = await multicall(ERC20_ABI, calls)
  console.log(`fetchFarm() tokenBalanceLP ${JSON.stringify(tokenBalanceLP[0]._hex)}`)
  console.log(`fetchFarm() lpTotalSupply ${JSON.stringify(lpTotalSupply)}`)
  console.log(`fetchFarm() quoteTokenBalanceLP ${JSON.stringify(quoteTokenBalanceLP)}`)
  console.log(`fetchFarm() lpTokenBalanceMC ${JSON.stringify(lpTokenBalanceMC)}`)
  console.log(`fetchFarm() tokenDecimals ${JSON.stringify(tokenDecimals)}`)
  console.log(`fetchFarm() quoteTokenDecimals ${JSON.stringify(quoteTokenDecimals)}`)

  // Ratio in % of LP tokens that are staked in the MC, vs the total number in circulation
  const lpTokenRatio = new BigNumber(lpTokenBalanceMC[0]._hex).div(new BigNumber(lpTotalSupply[0]._hex)).isNaN() ? BIG_ZERO :new BigNumber(lpTokenBalanceMC[0]._hex).div(new BigNumber(lpTotalSupply[0]._hex));
  console.log(`fetchFarm() lpTokenRatio ${JSON.stringify(lpTokenRatio)}`)

  // Raw amount of token in the LP, including those not staked
  const tokenAmountTotal = new BigNumber(tokenBalanceLP[0]._hex).div(BIG_TEN.pow(tokenDecimals))
  console.log(`fetchFarm() tokenAmountTotal ${JSON.stringify(tokenAmountTotal)}`)
  const quoteTokenAmountTotal = new BigNumber(quoteTokenBalanceLP[0]._hex).div(BIG_TEN.pow(quoteTokenDecimals))
  console.log(`fetchFarm() quoteTokenAmountTotal ${JSON.stringify(quoteTokenAmountTotal)}`)

  // Amount of quoteToken in the LP that are staked in the MC
  const quoteTokenAmountMc = quoteTokenAmountTotal.times(lpTokenRatio)
  console.log(`fetchFarm() quoteTokenAmountMc ${JSON.stringify(quoteTokenAmountMc)}`)

  // Total staked in LP, in quote token value
  const lpTotalInQuoteToken = quoteTokenAmountMc.times(new BigNumber(2))
  console.log(`fetchFarm() lpTotalInQuoteToken ${JSON.stringify(lpTotalInQuoteToken)}`)

  // Only make masterchef calls if farm has pid
  const [info, totalAllocPoint] =
    pid || pid === 0
      ? await multicall(masterchefABI, [
          {
            address: getMasterChefAddress(NETWORK_CHAIN_ID),
            name: 'poolInfo',
            params: [pid]
          },
          {
            address: getMasterChefAddress(NETWORK_CHAIN_ID),
            name: 'totalAllocPoint'
          }
        ])
      : [null, null]

  console.log(`fetchFarm() info ${JSON.stringify(info)}`)
  console.log(`fetchFarm() totalAllocPoint ${JSON.stringify(totalAllocPoint)}`)
  const allocPoint = info === undefined ? BIG_ZERO : info[1] === undefined ? BIG_ZERO : (new BigNumber(info[1]._hex))
  console.log(`fetchFarm() allocPoint ${allocPoint}`)
  const poolWeight =
    totalAllocPoint === undefined
      ? BIG_ZERO
      : totalAllocPoint[0] === undefined
      ? allocPoint.div(new BigNumber(totalAllocPoint[0]._hex))
      : BIG_ZERO
  console.log(`fetchFarm() poolWeight ${poolWeight}`)
  const tokenPriceVsQuote = tokenAmountTotal.lt(BIG_ONE)
    ? BIG_ZERO.toJSON()
    : quoteTokenAmountTotal.div(tokenAmountTotal).toJSON()
  console.log(
    `fetchFarm() quoteTokenAmountTotal / tokenAmountTotal = tokenPriceVsQuote (${JSON.stringify(
      quoteTokenAmountTotal
    )} / ${JSON.stringify(tokenAmountTotal)} ${JSON.stringify(tokenPriceVsQuote)} )`
  )
  const result = {
    tokenAmountTotal: tokenAmountTotal.toJSON(),
    lpTotalSupply: new BigNumber(lpTotalSupply[0]._hex).toJSON(),
    lpTotalInQuoteToken: lpTotalInQuoteToken.toJSON(),
    tokenPriceVsQuote: tokenPriceVsQuote,
    poolWeight: poolWeight.toJSON(),
    multiplier: `${allocPoint.div(100).toString()}X`
  }
  console.log(`fetchFarm() result ${JSON.stringify(result)}`)
  return result
}

export default fetchFarm
