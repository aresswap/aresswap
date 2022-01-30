import { ChainId } from '@uniswap/sdk'
import { MASTER_CHEF_ADDRESS } from 'constants/addresses'

export const getMasterChefAddress = (chainId : ChainId | undefined) : string | undefined => {
    return chainId == undefined ? undefined : MASTER_CHEF_ADDRESS[chainId];
}