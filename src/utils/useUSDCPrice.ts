import { ChainId, Currency, JSBI, Price, } from '@uniswap/sdk'
import { useMemo } from 'react'
import { USDC, WRAPPED_TOKEN } from '../constants'
import { PairState, usePairs } from '../data/Reserves'
import { useActiveWeb3React } from '../hooks'
import { wrappedCurrency } from './wrappedCurrency'

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export default function useUSDCPrice(currency?: Currency): Price | undefined {
  const { chainId } = useActiveWeb3React()
  const wrapped = wrappedCurrency(currency, chainId)
  const tokenPairs: [Currency | undefined, Currency | undefined][] = useMemo(
    () => [
      [
        chainId && wrapped && WRAPPED_TOKEN[chainId].address === wrapped.address ? undefined : currency,
        chainId ? WRAPPED_TOKEN[chainId] : undefined
      ],
      [
        wrapped?.equals(USDC[chainId === undefined ? ChainId.ROPSTEN : chainId]) ? undefined : wrapped,
        USDC[chainId === undefined ? ChainId.ROPSTEN : chainId]
      ],
      [
        chainId ? WRAPPED_TOKEN[chainId] : undefined,
        USDC[chainId === undefined ? ChainId.ROPSTEN : chainId]
      ]
    ],
    [chainId, currency, wrapped]
  )
  const [[ethPairState, ethPair], [usdcPairState, usdcPair], [usdcEthPairState, usdcEthPair]] = usePairs(tokenPairs)

  return useMemo(() => {
    if (!currency || !wrapped || !chainId) {
      return undefined
    }
    // handle WRAPPED_TOKEN/eth
    if (wrapped.equals(WRAPPED_TOKEN[chainId])) {
      if (usdcPair) {
        const price = usdcPair.priceOf(WRAPPED_TOKEN[chainId])
        return new Price(
          currency,
          USDC[chainId === undefined ? ChainId.ROPSTEN : chainId],
          price.denominator,
          price.numerator
        )
      } else {
        return undefined
      }
    }
    // handle usdc
    if (wrapped.equals(USDC[chainId === undefined ? ChainId.ROPSTEN : chainId])) {
      return new Price(
        USDC[chainId === undefined ? ChainId.ROPSTEN : chainId],
        USDC[chainId === undefined ? ChainId.ROPSTEN : chainId],
        '1',
        '1'
      )
    }

    const ethPairETHAmount = ethPair?.reserveOf(WRAPPED_TOKEN[chainId])
    const ethPairETHUSDCValue: JSBI =
      ethPairETHAmount && usdcEthPair ? usdcEthPair.priceOf(WRAPPED_TOKEN[chainId]).quote(ethPairETHAmount).raw : JSBI.BigInt(0)

    // all other tokens
    // first try the usdc pair
    if (
      usdcPairState === PairState.EXISTS &&
      usdcPair &&
      usdcPair.reserveOf(USDC[chainId === undefined ? ChainId.ROPSTEN : chainId]).greaterThan(ethPairETHUSDCValue)
    ) {
      const price = usdcPair.priceOf(wrapped)
      return new Price(
        currency,
        USDC[chainId === undefined ? ChainId.ROPSTEN : chainId],
        price.denominator,
        price.numerator
      )
    }
    if (ethPairState === PairState.EXISTS && ethPair && usdcEthPairState === PairState.EXISTS && usdcEthPair) {
      if (
        usdcEthPair.reserveOf(USDC[chainId === undefined ? ChainId.ROPSTEN : chainId]).greaterThan('0') &&
        ethPair.reserveOf(WRAPPED_TOKEN[chainId]).greaterThan('0')
      ) {
        const ethUsdcPrice = usdcEthPair.priceOf(USDC[chainId === undefined ? ChainId.ROPSTEN : chainId])
        const currencyEthPrice = ethPair.priceOf(WRAPPED_TOKEN[chainId])
        const usdcPrice = ethUsdcPrice.multiply(currencyEthPrice).invert()
        return new Price(
          currency,
          USDC[chainId === undefined ? ChainId.ROPSTEN : chainId],
          usdcPrice.denominator,
          usdcPrice.numerator
        )
      }
    }
    return undefined
  }, [chainId, currency, ethPair, ethPairState, usdcEthPair, usdcEthPairState, usdcPair, usdcPairState, wrapped])
}