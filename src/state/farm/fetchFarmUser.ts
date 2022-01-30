import erc20ABI from 'constants/abis/erc20.json'
import { abi as masterchefABI } from 'constants/abis/master-chef-contract.json'
import multicall from 'utils/multicall'
import { getMasterChefAddress } from 'utils/addressHelper'
import { SerializedFarmConfig } from './types'
import { NETWORK_CHAIN_ID } from 'connectors'
import BigNumber from 'bignumber.js'

export const fetchFarmUserAllowances = async (account: string, farmsToFetch: SerializedFarmConfig[]) => {
  const masterChefAddress = getMasterChefAddress(NETWORK_CHAIN_ID)

  const calls = farmsToFetch.map(farm => {
    return { address: farm.lpAddresses, name: 'allowance', params: [account, masterChefAddress] }
  })

  const rawLpAllowances = await multicall(erc20ABI, calls)
  const parsedLpAllowances = rawLpAllowances.map((lpBalance: Array<any>) => {
    return new BigNumber(lpBalance[0]._hex).toJSON()
  })
  return parsedLpAllowances
}

export const fetchFarmUserTokenBalances = async (account: string, farmsToFetch: SerializedFarmConfig[]) => {
  const calls = farmsToFetch.map(farm => {
    return {
      address: farm.lpAddresses,
      name: 'balanceOf',
      params: [account]
    }
  })

  const rawTokenBalances = await multicall(erc20ABI, calls)
  console.log(`fetchFarmUserTokenBalances() rawTokenBalances : ${JSON.stringify(rawTokenBalances)}`)
  const parsedTokenBalances = rawTokenBalances.map((tokenBalance:Array<any>) => {
    return new BigNumber(tokenBalance[0]._hex).toJSON()
  })
  return parsedTokenBalances
}

export const fetchFarmUserStakedBalances = async (account: string, farmsToFetch: SerializedFarmConfig[]) => {
  const masterChefAddress = getMasterChefAddress(NETWORK_CHAIN_ID)

  const calls = farmsToFetch.map(farm => {
    return {
      address: masterChefAddress === undefined ? '0x' : masterChefAddress,
      name: 'userInfo',
      params: [farm.pid, account]
    }
  })

  const rawStakedBalances = await multicall(masterchefABI, calls)
  console.log(`fetchFarmUserTokenBalances() rawStakedBalances : ${JSON.stringify(rawStakedBalances)}`)
  const parsedStakedBalances = rawStakedBalances.map((stakedBalance: Array<any>) => {
    return new BigNumber(stakedBalance[0]._hex).toJSON()
  })
  return parsedStakedBalances
}

export const fetchFarmUserEarnings = async (account: string, farmsToFetch: SerializedFarmConfig[]) => {
  const masterChefAddress = getMasterChefAddress(NETWORK_CHAIN_ID)

  const calls = farmsToFetch.map(farm => {
    return {
      address: masterChefAddress === undefined ? '0x' : masterChefAddress,
      name: 'pendingCake',
      params: [farm.pid, account]
    }
  })

  const rawEarnings = await multicall(masterchefABI, calls)
  const parsedEarnings = rawEarnings.map((earnings:Array<any>) => {
    return new BigNumber(earnings[0]._hex).toJSON()
  })
  return parsedEarnings
}
