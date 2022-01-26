import { CardSection, DataCard, CardNoise, CardBGImage } from '../../components/earn/styled'
import React, { useMemo, useRef } from 'react'
import styled from 'styled-components'
import { AutoColumn } from '../../components/Column'
import { RowBetween } from '../../components/Row'
import { TYPE, ExternalLink } from '../../theme'
import Loader from 'components/Loader'
import FarmingPoolCard from 'components/earn/FarmingPoolCard'
import { useActiveWeb3React } from 'hooks'
import { DeserializedFarm, FarmWithStakedValue } from 'state/farm/types'
import { useCallback, useState } from 'react'
import BigNumber from 'bignumber.js'
import { useFarms, usePollFarmsWithUserData, usePriceCakeBusd } from 'state/farm/hooks'
import { getFarmApr } from 'utils/apr'
import { latinise } from 'utils/latinise'
import { useLocation } from 'react-router-dom'
import { useWeb3React } from '@web3-react/core'
import isArchivedPid from 'utils/farmHelper'
import { BIG_ZERO } from 'constants/types'
import { orderBy } from 'lodash'
const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`
const NUMBER_OF_FARMS_VISIBLE = 12

// const getDisplayApr = (cakeRewardsApr?: number, lpRewardsApr?: number) => {
//   if (cakeRewardsApr && lpRewardsApr) {
//     return (cakeRewardsApr + lpRewardsApr).toLocaleString('en-US', { maximumFractionDigits: 2 })
//   }
//   if (cakeRewardsApr) {
//     return cakeRewardsApr.toLocaleString('en-US', { maximumFractionDigits: 2 })
//   }
//   return null
// }

export default function Farm() {
  const {chainId} = useActiveWeb3React();
  //const { path } = useRouteMatch()
  const { pathname } = useLocation()
  //const { t } = useTranslation()
  const { data: farmsLP, userDataLoaded } = useFarms()
  const cakePrice = usePriceCakeBusd()
  const [query] = useState('')
  const { account } = useWeb3React()
  const [sortOption] = useState('hot')
  const chosenFarmsLength = useRef(0)

  const isArchived = pathname.includes('archived')
  const isInactive = pathname.includes('history')
  const isActive = !isInactive && !isArchived

  console.log(`farm() ${isArchived}`)

  usePollFarmsWithUserData(isArchived)

  // Users with no wallet connected should see 0 as Earned amount
  // Connected users should see loading indicator until first userData has loaded
  const userDataReady = !account || (!!account && userDataLoaded)

  const activeFarms = farmsLP.filter(farm => farm.pid !== 0 && farm.multiplier !== '0X' && !isArchivedPid(farm.pid))
  const inactiveFarms = farmsLP.filter(farm => farm.pid !== 0 && farm.multiplier === '0X' && !isArchivedPid(farm.pid))
  const archivedFarms = farmsLP.filter(farm => isArchivedPid(farm.pid))

  const stakedOnlyFarms = activeFarms.filter(
    farm => farm.userData && new BigNumber(farm.userData.stakedBalance).gt(BIG_ZERO)
  )

  const stakedInactiveFarms = inactiveFarms.filter(
    farm => farm.userData && new BigNumber(farm.userData.stakedBalance).gt(BIG_ZERO)
  )

  const stakedArchivedFarms = archivedFarms.filter(
    farm => farm.userData && new BigNumber(farm.userData.stakedBalance).gt(BIG_ZERO)
  )

  const farmsList = useCallback(
    (farmsToDisplay: DeserializedFarm[]): FarmWithStakedValue[] => {
      let farmsToDisplayWithAPR: FarmWithStakedValue[] = farmsToDisplay.map(farm => {
        if (!farm.lpTotalInQuoteToken || !farm.quoteTokenPriceBusd) {
          return farm
        }
        const totalLiquidity = new BigNumber(farm.lpTotalInQuoteToken).times(farm.quoteTokenPriceBusd)
        const { cakeRewardsApr, lpRewardsApr } = isActive
          ? getFarmApr(
              new BigNumber(farm.poolWeight === undefined ? 0 : farm.poolWeight),
              cakePrice,
              totalLiquidity,
              farm.lpAddresses
            )
          : { cakeRewardsApr: 0, lpRewardsApr: 0 }

        return { ...farm, apr: cakeRewardsApr, lpRewardsApr, liquidity: totalLiquidity }
      })

      if (query) {
        const lowercaseQuery = latinise(query.toLowerCase())
        farmsToDisplayWithAPR = farmsToDisplayWithAPR.filter((farm: FarmWithStakedValue) => {
          return latinise(farm.lpSymbol.toLowerCase()).includes(lowercaseQuery)
        })
      }
      return farmsToDisplayWithAPR
    },
    [chainId,cakePrice, query, isActive]
  )
  // const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setQuery(event.target.value)
  // }
  const [numberOfFarmsVisible] = useState(NUMBER_OF_FARMS_VISIBLE)

  const chosenFarmsMemoized = useMemo(() => {
    let chosenFarms = Array<FarmWithStakedValue>()

    const sortFarms = (farms: FarmWithStakedValue[]): FarmWithStakedValue[] => {
      switch (sortOption) {
        case 'apr':
          return orderBy(farms, (farm: FarmWithStakedValue) => farm.apr === undefined ? 0 : farm.apr  + (farm.lpRewardsApr === undefined ? 0 : farm.lpRewardsApr), 'desc')
        case 'multiplier':
          return orderBy(
            farms,
            (farm: FarmWithStakedValue) => (farm.multiplier ? Number(farm.multiplier.slice(0, -1)) : 0),
            'desc'
          )
        case 'earned':
          return orderBy(
            farms,
            (farm: FarmWithStakedValue) => (farm.userData ? Number(farm.userData.earnings) : 0),
            'desc'
          )
        case 'liquidity':
          return orderBy(farms, (farm: FarmWithStakedValue) => Number(farm.liquidity), 'desc')
        default:
          return farms
      }
    }

    if (isActive) {
      chosenFarms = farmsList(activeFarms)
    }
    if (isInactive) {
      chosenFarms = farmsList(inactiveFarms)
    }
    if (isArchived) {
      chosenFarms = farmsList(archivedFarms)
    }

    return sortFarms(chosenFarms).slice(0, numberOfFarmsVisible)
  }, [
    sortOption,
    activeFarms,
    farmsList,
    inactiveFarms,
    archivedFarms,
    isActive,
    isInactive,
    isArchived,
    stakedArchivedFarms,
    stakedInactiveFarms,
    stakedOnlyFarms,
    numberOfFarmsVisible
  ])
  chosenFarmsLength.current = chosenFarmsMemoized.length

  console.log(`Farm() chosenFarmsLength ${JSON.stringify(chosenFarmsLength)}`)
  console.log(`Farm() chosenFarmsMemoized ${JSON.stringify(chosenFarmsMemoized)}`)
  return (
    <PageWrapper gap="lg" justify="center">
      <TopSection gap="md">
        <DataCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>AresSwap Farming</TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>
                  Deposit your Liquidity Provider tokens to receive WAR, the AresSwap protocol.
                </TYPE.white>
              </RowBetween>{' '}
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                href="https://uniswap.org/blog/uni/"
                target="_blank"
              >
                <TYPE.white fontSize={14}>Read more about WAR</TYPE.white>
              </ExternalLink>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </DataCard>
      </TopSection>

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Participating pools</TYPE.mediumHeader>
        </DataRow>

        <PoolSection>
          {userDataReady && chosenFarmsMemoized.length === 0 ? (
            <Loader style={{ margin: 'auto' }} />
          ) : (
            chosenFarmsMemoized?.map(farmingPoolInfo => {
              // need to sort by added liquidity here
              return (
                <FarmingPoolCard farmingPoolInfo={farmingPoolInfo} key={farmingPoolInfo.pid}></FarmingPoolCard>
              )
            })
          )}
        </PoolSection>
      </AutoColumn>
    </PageWrapper>
  )
}
