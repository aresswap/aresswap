import { useWeb3React } from '@web3-react/core'
import farms from 'constants/farms'
import { BIG_ZERO } from 'constants/types'
import BigNumber from 'bignumber.js'
import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { AppState, useAppDispatch } from 'state'
import isArchivedPid from 'utils/farmHelper'
import { getBalanceAmount } from 'utils/formatBalance'
import { fetchFarmsPublicDataAsync, fetchFarmUserDataAsync } from '.'
import {
  DeserializedFarm,
  DeserializedFarmsState,
  DeserializedFarmUserData,
  deserializeToken,
  SerializedFarm
} from './types'
export const nonArchivedFarms = farms.filter(({ pid }) => !isArchivedPid(pid))
const deserializeFarmUserData = (farm: SerializedFarm): DeserializedFarmUserData => {
  return {
    allowance: farm.userData ? new BigNumber(farm.userData.allowance) : BIG_ZERO,
    tokenBalance: farm.userData ? new BigNumber(farm.userData.tokenBalance) : BIG_ZERO,
    stakedBalance: farm.userData ? new BigNumber(farm.userData.stakedBalance) : BIG_ZERO,
    earnings: farm.userData ? new BigNumber(farm.userData.earnings) : BIG_ZERO
  }
}

const deserializeFarm = (farm: SerializedFarm): DeserializedFarm => {
  const { lpAddresses, lpSymbol, pid, dual, multiplier, isCommunity, quoteTokenPriceBusd, tokenPriceBusd } = farm

  console.log(`deserializeFarm() farm.userData ${JSON.stringify(farm.userData)}`)

  return {
    lpAddresses,
    lpSymbol,
    pid,
    dual,
    multiplier,
    isCommunity,
    quoteTokenPriceBusd,
    tokenPriceBusd,
    baseToken: deserializeToken(farm.baseToken),
    quoteToken: deserializeToken(farm.quoteToken),
    userData: deserializeFarmUserData(farm),
    tokenAmountTotal: farm.tokenAmountTotal ? new BigNumber(farm.tokenAmountTotal) : BIG_ZERO,
    lpTotalInQuoteToken: farm.lpTotalInQuoteToken ? new BigNumber(farm.lpTotalInQuoteToken) : BIG_ZERO,
    lpTotalSupply: farm.lpTotalSupply ? new BigNumber(farm.lpTotalSupply) : BIG_ZERO,
    tokenPriceVsQuote: farm.tokenPriceVsQuote ? new BigNumber(farm.tokenPriceVsQuote) : BIG_ZERO,
    poolWeight: farm.poolWeight ? new BigNumber(farm.poolWeight) : BIG_ZERO
  }
}

export const usePollFarmsPublicData = (includeArchive = false) => {
  const dispatch = useAppDispatch()
  const slowRefresh = false

  useEffect(() => {
    const farmsToFetch = includeArchive ? farms : nonArchivedFarms
    const pids = farmsToFetch.map(farmToFetch => farmToFetch.pid)

    dispatch(fetchFarmsPublicDataAsync(pids))
  }, [includeArchive, dispatch, slowRefresh])
}

export const usePollFarmsWithUserData = (includeArchive = false) => {
  const dispatch = useAppDispatch()
  const slowRefresh = false
  const { account } = useWeb3React()

  useEffect(() => {
    const farmsToFetch = includeArchive ? farms : nonArchivedFarms
    console.log(`usePollFarmsWithUserData() farmsToFetch ${JSON.stringify(farmsToFetch)}`)
    const pids = farmsToFetch.map(farmToFetch => farmToFetch.pid)
    console.log(`usePollFarmsWithUserData() pids ${JSON.stringify(pids)}`)

    dispatch(fetchFarmsPublicDataAsync(pids))

    if (account) {
      dispatch(fetchFarmUserDataAsync({ account, pids }))
    }
  }, [includeArchive, dispatch, slowRefresh, account])
}

/**
 * Fetches the "core" farm data used globally
 * 251 = CAKE-BNB LP
 * 252 = BUSD-BNB LP
 */
export const usePollCoreFarmData = () => {
  const dispatch = useAppDispatch()
  const fastRefresh = false

  useEffect(() => {
    dispatch(fetchFarmsPublicDataAsync([251, 252]))
  }, [dispatch, fastRefresh])
}

export const useFarms = (): DeserializedFarmsState => {
  const farms = useSelector((state: AppState) => state.farms)
  const deserializedFarmsData = farms.data.map(deserializeFarm)
  const { loadArchivedFarmsData, userDataLoaded } = farms
  return {
    loadArchivedFarmsData,
    userDataLoaded,
    data: deserializedFarmsData
  }
}

export const useFarmFromPid = (pid: number): DeserializedFarm => {
  const farm = useSelector((state: AppState) => state.farms.data.find(f => f.pid === pid))
  return deserializeFarm(farm!)
}

export const useFarmFromLpSymbol = (lpSymbol: string): DeserializedFarm => {
  const farm = useSelector((state: AppState) => state.farms.data.find(f => f.lpSymbol === lpSymbol))
  return deserializeFarm(farm!)
}

export const useFarmUser = (pid: number): DeserializedFarmUserData => {
  const { userData } = useFarmFromPid(pid)
  const { allowance, tokenBalance, stakedBalance, earnings } =
    userData == undefined
      ? {
          allowance: BIG_ZERO,
          tokenBalance: BIG_ZERO,
          stakedBalance: BIG_ZERO,
          earnings: BIG_ZERO
        }
      : userData
  return {
    allowance,
    tokenBalance,
    stakedBalance,
    earnings
  }
}

// Return the base token price for a farm, from a given pid
export const useBusdPriceFromPid = (pid: number): BigNumber => {
  const farm = useFarmFromPid(pid)
  return farm && new BigNumber(farm.tokenPriceBusd === undefined ? 0 : farm.tokenPriceBusd)
}

export const useLpTokenPrice = (symbol: string) => {
  const farm = useFarmFromLpSymbol(symbol)
  const farmTokenPriceInUsd = useBusdPriceFromPid(farm.pid)
  let lpTokenPrice = BIG_ZERO
  if (farm.lpTotalSupply == undefined || farm.lpTotalInQuoteToken == undefined) {
    return BIG_ZERO
  }
  if (farm.lpTotalSupply.gt(0) && farm.lpTotalInQuoteToken.gt(0)) {
    // Total value of base token in LP
    const valueOfBaseTokenInFarm = farmTokenPriceInUsd.times(
      farm.tokenAmountTotal === undefined ? BIG_ZERO : farm.tokenAmountTotal
    )
    // Double it to get overall value in LP
    const overallValueOfAllTokensInFarm = valueOfBaseTokenInFarm.times(2)
    // Divide total value of all tokens, by the number of LP tokens
    const totalLpTokens = getBalanceAmount(farm.lpTotalSupply === undefined ? new BigNumber(0) : farm.lpTotalSupply)
    lpTokenPrice = overallValueOfAllTokensInFarm.div(totalLpTokens)
  }

  return lpTokenPrice
}

// /!\ Deprecated , use the BUSD hook in /hooks

export const usePriceCakeBusd = (): BigNumber => {
  const cakeBnbFarm = useFarmFromPid(2)

  const cakePriceBusdAsString = cakeBnbFarm.tokenPriceBusd

  const cakePriceBusd = useMemo(() => {
    console.log(`usePriceCakeBusd() usePriceCakeBusd : ${cakePriceBusdAsString}`)
    return new BigNumber(cakePriceBusdAsString === undefined ? 0 : cakePriceBusdAsString)
  }, [cakePriceBusdAsString])

  return cakePriceBusd
}
