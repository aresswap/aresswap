import { ChainId } from '@uniswap/sdk'
import { USDC, WRAPPED_TOKEN } from 'constants/index'
import { BIG_ZERO, BIG_ONE } from 'constants/types'
import BigNumber from 'bignumber.js'
import filterFarmsByQuoteToken from 'utils/farmPriceHelpers'
import { SerializedFarm } from './types'

const getFarmFromTokenSymbol = (
  farms: SerializedFarm[],
  tokenSymbol: string,
  preferredQuoteTokens?: string[]
): SerializedFarm => {
  const farmsWithTokenSymbol = farms.filter(farm => farm.baseToken.symbol === tokenSymbol)
  const filteredFarm = filterFarmsByQuoteToken(farmsWithTokenSymbol, preferredQuoteTokens)
  return filteredFarm
}

const getFarmBaseTokenPrice = (
  farm: SerializedFarm,
  quoteTokenFarm: SerializedFarm,
  bnbPriceBusd: BigNumber
): BigNumber => {
  const hasTokenPriceVsQuote = Boolean(farm.tokenPriceVsQuote)

  if (
    farm.quoteToken.symbol === USDC[ChainId.MAINNET].symbol ||
    farm.quoteToken.symbol === USDC[ChainId.ROPSTEN].symbol
  ) {
    return hasTokenPriceVsQuote ? new BigNumber(farm.tokenPriceVsQuote ?? '0') : BIG_ZERO
  }

  if (
    farm.quoteToken.symbol === WRAPPED_TOKEN[ChainId.MAINNET].symbol ||
    farm.quoteToken.symbol === WRAPPED_TOKEN[ChainId.ROPSTEN].symbol
  ) {
    return hasTokenPriceVsQuote ? bnbPriceBusd.times(farm.tokenPriceVsQuote ?? '0') : BIG_ZERO
  }

  // We can only calculate profits without a quoteTokenFarm for BUSD/BNB farms
  if (!quoteTokenFarm) {
    return BIG_ZERO
  }

  // Possible alternative farm quoteTokens:
  // UST (i.e. MIR-UST), pBTC (i.e. PNT-pBTC), BTCB (i.e. bBADGER-BTCB), ETH (i.e. SUSHI-ETH)
  // If the farm's quote token isn't BUSD or WBNB, we then use the quote token, of the original farm's quote token
  // i.e. for farm PNT - pBTC we use the pBTC farm's quote token - BNB, (pBTC - BNB)
  // from the BNB - pBTC price, we can calculate the PNT - BUSD price
  if (
    quoteTokenFarm.quoteToken.symbol === WRAPPED_TOKEN[ChainId.MAINNET].symbol ||
    quoteTokenFarm.quoteToken.symbol === WRAPPED_TOKEN[ChainId.ROPSTEN].symbol
  ) {
    const quoteTokenInBusd = bnbPriceBusd.times(quoteTokenFarm.tokenPriceVsQuote ?? BIG_ZERO)
    return hasTokenPriceVsQuote && quoteTokenInBusd
      ? new BigNumber(farm.tokenPriceVsQuote === undefined ? '0' : farm.tokenPriceVsQuote).times(quoteTokenInBusd)
      : BIG_ZERO
  }

  if (
    quoteTokenFarm.quoteToken.symbol === USDC[ChainId.MAINNET].symbol ||
    quoteTokenFarm.quoteToken.symbol === USDC[ChainId.ROPSTEN].symbol
  ) {
    const quoteTokenInBusd = quoteTokenFarm.tokenPriceVsQuote
    return hasTokenPriceVsQuote && quoteTokenInBusd
      ? new BigNumber(farm.tokenPriceVsQuote === undefined ? '0' : farm.tokenPriceVsQuote).times(quoteTokenInBusd)
      : BIG_ZERO
  }

  // Catch in case token does not have immediate or once-removed BUSD/WBNB quoteToken
  return BIG_ZERO
}

const getFarmQuoteTokenPrice = (
  farm: SerializedFarm,
  quoteTokenFarm: SerializedFarm,
  bnbPriceBusd: BigNumber
): BigNumber => {
  if (farm.quoteToken.symbol === 'USDC') {
    return BIG_ONE
  }

  if (farm.quoteToken.symbol === 'WMETIS') {
    return bnbPriceBusd
  }

  if (!quoteTokenFarm) {
    return BIG_ZERO
  }

  if (quoteTokenFarm.quoteToken.symbol === 'WMETIS') {
    return quoteTokenFarm.tokenPriceVsQuote ? bnbPriceBusd.times(quoteTokenFarm.tokenPriceVsQuote) : BIG_ZERO
  }

  if (quoteTokenFarm.quoteToken.symbol === 'USDC') {
    return quoteTokenFarm.tokenPriceVsQuote ? new BigNumber(quoteTokenFarm.tokenPriceVsQuote ?? '0') : BIG_ZERO
  }

  return BIG_ZERO
}

const fetchFarmsPrices = async (farms: SerializedFarm[]) => {
  const bnbBusdFarm = farms.find(farm => farm.pid === 1)
  const bnbPriceBusd =
    bnbBusdFarm == undefined
      ? BIG_ZERO
      : bnbBusdFarm.tokenPriceVsQuote
      ? new BigNumber(bnbBusdFarm.tokenPriceVsQuote).lt(BIG_ONE)
        ? BIG_ZERO
        : BIG_ONE.div(bnbBusdFarm.tokenPriceVsQuote)
      : BIG_ZERO

  const farmsWithPrices = farms.map(farm => {
    const quoteTokenFarm = getFarmFromTokenSymbol(farms, farm.quoteToken.symbol!)
    const tokenPriceBusd = getFarmBaseTokenPrice(farm, quoteTokenFarm, bnbPriceBusd)
    const quoteTokenPriceBusd = getFarmQuoteTokenPrice(farm, quoteTokenFarm, bnbPriceBusd)

    return {
      ...farm,
      tokenPriceBusd: tokenPriceBusd.toString(),
      quoteTokenPriceBusd: quoteTokenPriceBusd.toString()
    }
  })

  return farmsWithPrices
}

export default fetchFarmsPrices
