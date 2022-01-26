import { BIG_ONE, BIG_ZERO } from 'constants/types'
import BigNumber from 'bignumber.js'
import { BLOCKS_PER_YEAR, CAKE_PER_YEAR } from 'utils/config/index'
import lpAprs from 'utils/lpApr'

/**
 * Get the APR value in %
 * @param stakingTokenPrice Token price in the same quote currency
 * @param rewardTokenPrice Token price in the same quote currency
 * @param totalStaked Total amount of stakingToken in the pool
 * @param tokenPerBlock Amount of new cake allocated to the pool for each new block
 * @returns Null if the APR is NaN or infinite.
 */
export const getPoolApr = (
  stakingTokenPrice: number,
  rewardTokenPrice: number,
  totalStaked: number,
  tokenPerBlock: number
): number => {
  const totalRewardPricePerYear = new BigNumber(rewardTokenPrice).times(tokenPerBlock).times(BLOCKS_PER_YEAR)
  const totalStakingTokenInPool = new BigNumber(stakingTokenPrice).times(totalStaked)
  const apr = totalRewardPricePerYear.div(totalStakingTokenInPool).times(100)
  return apr === null ? 0 :  apr.toNumber()
}

/**
 * Get farm APR value in %
 * @param poolWeight allocationPoint / totalAllocationPoint
 * @param cakePriceUsd Cake price in USD
 * @param poolLiquidityUsd Total pool liquidity in USD
 * @param farmAddress Farm Address
 * @returns Farm Apr
 */
export const getFarmApr = (
  poolWeight: BigNumber,
  cakePriceUsd: BigNumber,
  poolLiquidityUsd: BigNumber,
  farmAddress: string
): { cakeRewardsApr: number; lpRewardsApr: number } => {
  const yearlyCakeRewardAllocation = poolWeight ? poolWeight.times(CAKE_PER_YEAR) : new BigNumber(NaN)
  const cakeRewardsApr = 
  poolLiquidityUsd.lt(BIG_ONE) ? BIG_ZERO :
  yearlyCakeRewardAllocation
    .times(cakePriceUsd)
    .div(poolLiquidityUsd)
    .times(100)
  let cakeRewardsAprAsNumber = 0
  cakeRewardsAprAsNumber = cakeRewardsApr.toNumber()
  const index = lpAprs.findIndex(e => e.address.toLowerCase() === farmAddress.toLowerCase())
  const lpRewardsApr = index === -1 ? 0 : lpAprs[index].apr
  return { cakeRewardsApr: cakeRewardsAprAsNumber, lpRewardsApr }
}

export default null
