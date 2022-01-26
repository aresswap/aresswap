import { ChainId } from '@uniswap/sdk'
import { MASTER_CHEF_ADDRESS } from 'constants/addresses'

export const getMasterChefAddress = (chainId : ChainId) => {
    return MASTER_CHEF_ADDRESS[chainId]
}