import { ChainId, Token, TokenAmount } from '@uniswap/sdk'
import { dWAR, WAR } from '../../constants/index'
import { useMemo } from 'react'
import {
  useMultipleContractSingleData,
  useSingleCallResult,
  useSingleContractMultipleData
} from 'state/multicall/hooks'
import { useMasterChefContract, useMulticallContract } from 'hooks/useContract'
import { BigNumber } from 'ethers'
import { Interface } from 'ethers/lib/utils'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { abi as ERC20_ABI } from '@uniswap/v2-core/build/ERC20.json'
import { useActiveWeb3React } from 'hooks'
import { MASTER_CHEF_ADDRESS } from 'constants/addresses'
function usePoolLength(): number {
  const MASTER_CHEF_CONTRACT = useMasterChefContract()
  const poolLength = useSingleCallResult(MASTER_CHEF_CONTRACT, 'poolLength', [])
  console.log(`usePoolLength() poolLength ${JSON.stringify(poolLength)}`)
  return useMemo(() => {
    return poolLength.error
      ? 0
      : poolLength.syncing
      ? 0
      : poolLength.result === undefined
      ? 0
      : (poolLength.result[0] as BigNumber).toNumber()
  }, [poolLength])
}
function useTotalAllocPoint(): number {
  const MASTER_CHEF_CONTRACT = useMasterChefContract()
  useMulticallContract()
  const poolLength = useSingleCallResult(MASTER_CHEF_CONTRACT, 'totalAllocPoint', [])
  console.log(`usePoolLength() totalAllocPoint ${JSON.stringify(poolLength)}`)
  return useMemo(() => {
    return poolLength.error
      ? 0
      : poolLength.syncing
      ? 0
      : poolLength.result === undefined
      ? 0
      : (poolLength.result[0] as BigNumber).toNumber()
  }, [poolLength])
}
export const FarmingRewardInfo: {
  [chainId in ChainId]?: {
    tokens: [Token, Token]
    poolAddress: string
  }[]
} = {
  [ChainId.MAINNET]: [
    {
      tokens: [WAR[ChainId.MAINNET], dWAR[ChainId.MAINNET]],
      poolAddress: WAR[ChainId.MAINNET].address
    }
  ],
  [ChainId.ROPSTEN]: [
    {
      tokens: [WAR[ChainId.ROPSTEN], dWAR[ChainId.ROPSTEN]],
      poolAddress: WAR[ChainId.ROPSTEN].address
    }
  ]
}
export interface FarmingInfo {
  // pid
  pid: number
  lpAddress: string
  /// multiplier
  multiplier: number
  /// pool's allocPoint / totalAllocPoint
  poolWeight: number
}
export interface FarmingData {
  lpSymbol: string
  lpAddress: string
  pid: number
  baseToken: Token
  quoteToken: Token
}
export interface FarmingPoolInfo extends FarmingInfo {
  baseTokenAmount: TokenAmount
  quoteTokenAmount: TokenAmount
  baseTokenPriceInUsd: number
  balanceOfMc: BigNumber
}
export async function fetchFarmingJson(): Promise<FarmingData[]> {
  var farmingUrl =
    process.env.FARMING_URL_JSON ??
    'https://raw.githubusercontent.com/nandanurseptama/ares-swap-asset/master/farming_index.json'
  let response: Response
  try {
    response = await fetch(farmingUrl)
  } catch (error) {
    console.debug('Failed to fetch farm list', error)
  }
  if (!response!.ok) {
    console.debug('Failed to fetch farm list', response!.statusText)
    return []
  }
  var json = (await response!.json()) as Array<any>
  return json.map(e => {
    return {
      baseToken: e.baseToken,
      quoteToken: e.quoteToken,
      lpSymbol: e.lpSymbol,
      pid: e.pid,
      lpAddress: e.lpAddress
    }
  })
}
function useGetReserves(
  farmingInfos: FarmingInfo[],
  PAIR_INTERFACE: Interface
): {
  token0Amount: BigNumber
  token1Amount: BigNumber
}[] {
  const lpAddresses = useMemo(() => {
    return farmingInfos.map(e => {
      return e.lpAddress
    })
  }, [farmingInfos])
  const reserves = useMultipleContractSingleData(lpAddresses, PAIR_INTERFACE, 'getReserves')
  return useMemo(() => {
    return reserves
      .filter(e => {
        return !e.error && !e.loading && e.result !== undefined
      })
      .map(e => {
        return {
          token0Amount: e.result![0] as BigNumber,
          token1Amount: e.result![2] as BigNumber
        }
      })
  }, [reserves])
}
function useTokenInfo(address: string[]): Token[] {
  const ERC20_INTERFACE = new Interface(ERC20_ABI)
  const { chainId } = useActiveWeb3React()
  const name = useMultipleContractSingleData(address, ERC20_INTERFACE, 'name', [])
  const symbol = useMultipleContractSingleData(address, ERC20_INTERFACE, 'symbol', [])
  const decimals = useMultipleContractSingleData(address, ERC20_INTERFACE, 'decimals', [])
  return useMemo(() => {
    return address.map((e, index) => {
      return new Token(
        chainId === undefined ? ChainId.ROPSTEN : chainId,
        e,
        decimals[index].result === undefined ? 18 : ((decimals[index].result![0] as unknown) as number),
        symbol[index].result === undefined ? 'ERC20' : ((symbol[index].result![0] as unknown) as string),
        name[index].result === undefined ? 'ERC20' : ((name[index].result![0] as unknown) as string)
      )
    })
  }, [chainId, name, symbol, decimals])
}
function useToken(
  poolAddress: string[]
): {
  token0: Token
  token1: Token
  balanceOfMasterChef: BigNumber
}[] {
  const { chainId } = useActiveWeb3React()
  const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)
  const token0 = useMultipleContractSingleData(poolAddress, PAIR_INTERFACE, 'token0', [])
  const token0Addresses = token0
    .filter(e => {
      return e.result !== undefined
    })
    .map(e => {
      return e.result![0] as string
    })
  const token0Info = useTokenInfo(token0Addresses)
  const token1 = useMultipleContractSingleData(poolAddress, PAIR_INTERFACE, 'token1', [])
  const token1Addresses = token1
    .filter(e => {
      return e.result !== undefined
    })
    .map(e => {
      return e.result![0] as string
    })
  const token1Info = useTokenInfo(token1Addresses)
  const balanceOfMasterChef = useMultipleContractSingleData(poolAddress, PAIR_INTERFACE, 'balanceOf', [
    MASTER_CHEF_ADDRESS[chainId === undefined ? ChainId.ROPSTEN : chainId]
  ])
  const balanceOfMC = Array<BigNumber>()
  for (var i = 0; i < balanceOfMasterChef.length; i++) {
    if (balanceOfMasterChef[i].result !== undefined) {
      balanceOfMC.push(balanceOfMasterChef[i].result![0] as BigNumber)
    }
  }
  return useMemo(() => {
    return token1Info.map((e, index) => {
      return {
        token0: token0Info[index],
        token1: e,
        balanceOfMasterChef: balanceOfMC[index]
      }
    })
  }, [chainId,token0Info, token1Info, balanceOfMC])
}
export function useFarmingPoolInfo(): FarmingPoolInfo[] {
  //const{chainId} = useActiveWeb3React()
  const farmingInfos = useFarmingInfo()
  console.log(`useFarmingPoolInfo() useFarmingInfo ${JSON.stringify(farmingInfos)}`)

  const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)
  const reserves = useGetReserves(farmingInfos, PAIR_INTERFACE)
  console.log(`useFarmingPoolInfo() reserves ${JSON.stringify(reserves)}`)
  const lpAddresses = useMemo(() => {
    return farmingInfos.map(e => e.lpAddress)
  }, [farmingInfos])
  const baseToken = useToken(lpAddresses)
  console.log(`useFarmingPoolInfo() baseToken ${JSON.stringify(baseToken)}`)
  return useMemo(() => {
    if (baseToken.length !== farmingInfos.length || reserves.length !== farmingInfos.length) {
      return []
    }
    return farmingInfos.map((e, index) => {
      return {
        ...farmingInfos[index],
        baseTokenAmount: new TokenAmount(baseToken[index].token0, reserves[index].token0Amount.toString()),
        quoteTokenAmount: new TokenAmount(baseToken[index].token1, reserves[index].token1Amount.toString()),
        baseTokenPriceInUsd: 0,
        balanceOfMc: baseToken[index].balanceOfMasterChef
      }
    })
  }, [farmingInfos, reserves, baseToken])
}
export function useFarmingInfo(): FarmingInfo[] {
  const { chainId } = useActiveWeb3React()
  // get all the info from the farming rewards contracts
  const poolLength = usePoolLength()
  const totalAllocPoint = useTotalAllocPoint()
  console.log(`useFarmingInfo() poolLength ${poolLength}`)
  var callInputs = useMemo(() => {
    var x = Array<Array<number>>()
    for (var i = 0; i < poolLength; i++) {
      x.push([i])
    }
    return x
  }, [poolLength])
  console.log(`useFarmingInfo() callInputs ${JSON.stringify(callInputs)}`)
  const MASTER_CHEF_CONTRACT = useMasterChefContract()
  const poolsResults = useSingleContractMultipleData(MASTER_CHEF_CONTRACT, 'poolInfo', callInputs)
  console.log(`useFarmingInfo() poolsResults Length ${poolsResults.length}`)
  console.log(`useFarmingInfo() poolsResults ${JSON.stringify(poolsResults)}`)
  var results = new Array<FarmingInfo>()
  return useMemo(() => {
    for (var i = 0; i < poolsResults.length; i++) {
      if (!poolsResults[i].error && !poolsResults[i].loading && poolsResults[i].result !== undefined) {
        if (
          (poolsResults[i].result![1] as BigNumber).toNumber() > 0 &&
          (poolsResults[i].result![0] as string).toLowerCase() !==
            WAR[chainId === undefined ? ChainId.ROPSTEN : chainId].address.toLowerCase()
        ) {
          results.push({
            pid: i,
            lpAddress: poolsResults[i].result![0] as string,
            multiplier: (poolsResults[i].result![1] as BigNumber).toNumber(),
            poolWeight:
              (poolsResults[i].result![1] as BigNumber).toNumber() === 0
                ? 0
                : totalAllocPoint / (poolsResults[i].result![1] as BigNumber).toNumber()
          })
        }
      }
    }
    return results
  }, [chainId, totalAllocPoint, poolsResults, results])
}
