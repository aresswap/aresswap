import { createAction } from '@reduxjs/toolkit'
import { ChainId } from '@uniswap/sdk'
import { FarmingPoolInfo } from './hook'

export const updateFarmPool = createAction<{ farmPools: FarmingPoolInfo; chainId: ChainId }>('farms/updateFarmPool');
