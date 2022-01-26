import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import isArchivedPid from 'utils/farmHelper'
import fetchFarms from './fetchFarms'
import fetchFarmsPrices from './fetchFarmsPrices'
import {
  fetchFarmUserEarnings,
  fetchFarmUserAllowances,
  fetchFarmUserTokenBalances,
  fetchFarmUserStakedBalances,
} from './fetchFarmUser'
import { farmsConfig, SerializedFarm, SerializedFarmsState } from './types'

const noAccountFarmConfig = farmsConfig.map((farm) => ({
  ...farm,
  userData: {
    allowance: '0',
    tokenBalance: '0',
    stakedBalance: '0',
    earnings: '0',
  },
}))

const initialState: SerializedFarmsState = {
  data: noAccountFarmConfig,
  loadArchivedFarmsData: false,
  userDataLoaded: false,
}

export const nonArchivedFarms = farmsConfig.filter(({ pid }) => !isArchivedPid(pid))

// Async thunks
export const fetchFarmsPublicDataAsync = createAsyncThunk<SerializedFarm[], number[]>(
  'farms/fetchFarmsPublicDataAsync',
  async (pids) => {
    const farmsToFetch = farmsConfig.filter((farmConfig) => pids.includes(farmConfig.pid))
    //console.log(`fetchFarmsPublicDataAsync() farmsToFetch ${JSON.stringify(farmsToFetch)}`);

    // Add price helper farms
    const farmsWithPriceHelpers = farmsToFetch

    const farms = await fetchFarms(farmsWithPriceHelpers)
    console.log(`fetchFarmsPublicDataAsync() farms ${JSON.stringify(farms)}`);
    const farmsWithPrices = await fetchFarmsPrices(farms)

    console.log(`fetchFarmsPublicDataAsync() farmsWithPrices ${JSON.stringify(farms)}`);
    // Filter out price helper LP config farms
    const farmsWithoutHelperLps = farmsWithPrices.filter((farm: SerializedFarm) => {
      return farm.pid || farm.pid === 0
    })

    return farmsWithoutHelperLps
  },
)

interface FarmUserDataResponse {
  pid: number
  allowance: string
  tokenBalance: string
  stakedBalance: string
  earnings: string
}

export const fetchFarmUserDataAsync = createAsyncThunk<FarmUserDataResponse[], { account: string; pids: number[] }>(
  'farms/fetchFarmUserDataAsync',
  async ({ account, pids }) => {
    const farmsToFetch = farmsConfig.filter((farmConfig) => pids.includes(farmConfig.pid))
    const userFarmAllowances = await fetchFarmUserAllowances(account, farmsToFetch)
    const userFarmTokenBalances = await fetchFarmUserTokenBalances(account, farmsToFetch)
    const userStakedBalances = await fetchFarmUserStakedBalances(account, farmsToFetch)
    const userFarmEarnings = await fetchFarmUserEarnings(account, farmsToFetch)
    console.log(`fetchFarmUserDataAsync() userFarmAllowances ${JSON.stringify(userFarmAllowances)}`);
    console.log(`fetchFarmUserDataAsync() userFarmTokenBalances ${JSON.stringify(userFarmTokenBalances)}`);
    console.log(`fetchFarmUserDataAsync() userStakedBalances ${JSON.stringify(userStakedBalances)}`);
    console.log(`fetchFarmUserDataAsync() userFarmEarnings ${JSON.stringify(userFarmEarnings)}`);

    return userFarmAllowances.map((farmAllowance: any, index: number) => {
      return {
        pid: farmsToFetch[index].pid,
        allowance: userFarmAllowances[index],
        tokenBalance: userFarmTokenBalances[index],
        stakedBalance: userStakedBalances[index],
        earnings: userFarmEarnings[index],
      }
    })
  },
)

export const farmsSlice = createSlice({
  name: 'Farms',
  initialState,
  reducers: {
    setLoadArchivedFarmsData: (state, action) => {
      const loadArchivedFarmsData = action.payload
      state.loadArchivedFarmsData = loadArchivedFarmsData
    },
  },
  extraReducers: (builder) => {
    // Update farms with live data
    builder.addCase(fetchFarmsPublicDataAsync.fulfilled, (state, action) => {
      state.data = state.data.map((farm) => {
        const liveFarmData = action.payload.find((farmData) => farmData.pid === farm.pid)
        return { ...farm, ...liveFarmData }
      })
    })

    // Update farms with user data
    builder.addCase(fetchFarmUserDataAsync.fulfilled, (state, action) => {
      action.payload.forEach((userDataEl) => {
        const { pid } = userDataEl
        const index = state.data.findIndex((farm: { pid: number }) => farm.pid === pid)
        state.data[index] = { ...state.data[index], userData: userDataEl }
      })
      state.userDataLoaded = true
    })
  },
})

// Actions
export const { setLoadArchivedFarmsData } = farmsSlice.actions

export default farmsSlice.reducer
