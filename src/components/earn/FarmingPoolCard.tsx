import React, { useCallback, useState } from 'react'
import { AutoColumn } from '../Column'
import { RowBetween } from '../Row'
import styled from 'styled-components'
import { TYPE, StyledInternalLink } from '../../theme'
import DoubleCurrencyLogo from '../DoubleLogo'
import { ETHER } from '@uniswap/sdk'
import { ButtonPrimary } from '../Button'
import { useColor } from '../../hooks/useColor'
import { CardNoise, CardBGImage } from './styled'
import { unwrappedToken } from '../../utils/wrappedCurrency'
//import { useTotalSupply } from '../../data/TotalSupply'
//import { usePair } from '../../data/Reserves'
import useUSDCPrice from '../../utils/useUSDCPrice'
//import { WAR } from '../../constants'
//import { useActiveWeb3React } from 'hooks'
import { FarmWithStakedValue } from 'state/farm/types'
import { BIG_TEN, BIG_ZERO } from 'constants/types'
import { useActiveWeb3React } from 'hooks'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/farm'
import useApproveFarm from 'pages/Farm/hook/useApproveFarm'
import { useTokenContract } from 'hooks/useContract'
import ConnectWalletButton from 'components/ConnectWalletButton'
import BigNumber from 'bignumber.js'
import UnstakingFarmModal from './UnstakingFarm'

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  display: none;
`};
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '1')};
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%, ${showBackground ? theme.black : theme.bg5} 100%) `};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;

  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding: 1rem;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`

// const BottomSection = styled.div<{ showBackground: boolean }>`
//   padding: 12px 16px;
//   opacity: ${({ showBackground }) => (showBackground ? '1' : '0.4')};
//   border-radius: 0 0 12px 12px;
//   display: flex;
//   flex-direction: row;
//   align-items: baseline;
//   justify-content: space-between;
//   z-index: 1;
// `

export default function FarmingPoolCard({ farmingPoolInfo }: { farmingPoolInfo: FarmWithStakedValue }) {
  const { account } = useActiveWeb3React()
  const isApproved =
    account &&
    farmingPoolInfo.userData &&
    farmingPoolInfo.userData.allowance &&
    farmingPoolInfo.userData.allowance.isGreaterThan(0)
  const [requestedApproval, setRequestedApproval] = useState(false)
  const token0 = farmingPoolInfo.baseToken
  const token1 = farmingPoolInfo.quoteToken
  const dispatch = useAppDispatch()
  const lpContract = useTokenContract(farmingPoolInfo.lpAddresses, true)
  const { onApprove } = useApproveFarm(lpContract!)

  const [ isFarmingModalOpen, setIsFarmingModalOpen ] = useState(false)

  console.log(`FarmingPoolCard() farmingPoolInfo ${JSON.stringify(farmingPoolInfo)}`)

  const currency0 = unwrappedToken(token0)
  const currency1 = unwrappedToken(token1)
  /// need to update
  const isStaking = Boolean(
    farmingPoolInfo.userData === undefined
      ? false
      : farmingPoolInfo.userData!.stakedBalance === undefined
      ? false
      : farmingPoolInfo.userData!.stakedBalance!.gt(BIG_ZERO)
  )

  // get the color of the token
  const token = currency0 === ETHER ? token1 : token0
  const WETH = currency0 === ETHER ? token0 : token1
  const backgroundColor = useColor(token)
  const totalValueFormatted =
    farmingPoolInfo.liquidity && farmingPoolInfo.liquidity.gt(0)
      ? `$${farmingPoolInfo.liquidity.toNumber().toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : ''
  console.log(totalValueFormatted)

  // get the USD value of staked WETH
  const USDPrice = useUSDCPrice(WETH)
  console.log(`FarmingPoolCard() USDPrice ${USDPrice}`)
  const token0Price = useUSDCPrice(token0)?.toFixed(token0.decimals)
  const token1Price = useUSDCPrice(token1)?.toFixed(token1.decimals)
  console.log(
    `FarmingPoolCard() token0Price ${JSON.stringify(token0Price)}  token1Price ${JSON.stringify(token1Price)}`
  )
  const liquidityValueInUsdc =
    token1Price === undefined || token0Price === undefined
      ? new BigNumber(0)
      : new BigNumber(token0Price).plus(new BigNumber(token1Price))
  console.log(`FarmingPoolCard() liquidityValueInUsdc ${liquidityValueInUsdc}`)

  const handleApprove = useCallback(async () => {
    try {
      if (account !== undefined && account !== null) {
        setRequestedApproval(true)
        await onApprove()
        dispatch(fetchFarmUserDataAsync({ account, pids: [farmingPoolInfo.pid] }))
        setRequestedApproval(false)
      }
    } catch (e) {
      console.error(e)
    }
  }, [onApprove, dispatch, account, farmingPoolInfo.pid])

  const showEarnReward = Boolean(
    farmingPoolInfo.userData === undefined
      ? false
      : farmingPoolInfo.userData.earnings === undefined
      ? false
      : farmingPoolInfo.userData.earnings.gt(new BigNumber(0))
  )
  const showWithdraw = Boolean(
    farmingPoolInfo.userData === undefined
      ? false
      : farmingPoolInfo.userData.stakedBalance === undefined
      ? false
      : farmingPoolInfo.userData.stakedBalance.gt(new BigNumber(0))
  )
  
  const [{ withdrawFarmError }] = useState<{
    showWithdrawFarm: boolean
    farmToWithdraw: FarmWithStakedValue | undefined
    attemptingTxn: boolean
    withdrawFarmError: string | undefined
    txHash: string | undefined
  }>({
    showWithdrawFarm: showWithdraw,
    farmToWithdraw: farmingPoolInfo,
    attemptingTxn: false,
    withdrawFarmError: undefined,
    txHash: undefined
  })
  // const handleWithdraw = useCallback(() => {
  //   if (!withdrawFundFarm) {
  //     return
  //   }
  //   setWithdrawFarmState({
  //     showWithdrawFarm: showWithdraw,
  //     farmToWithdraw: farmingPoolInfo,
  //     attemptingTxn: true,
  //     withdrawFarmError: undefined,
  //     txHash: undefined
  //   })
  //   withdrawFundFarm(farmingPoolInfo.userData!.stakedBalance!.toString())
  //     .then(hash => {
  //       setWithdrawFarmState({
  //         showWithdrawFarm: showWithdraw,
  //         farmToWithdraw: farmingPoolInfo,
  //         attemptingTxn: false,
  //         withdrawFarmError: undefined,
  //         txHash: hash
  //       })
  //     })
  //     .catch(e => {
  //       setWithdrawFarmState({
  //         showWithdrawFarm: showWithdraw,
  //         farmToWithdraw: farmingPoolInfo,
  //         attemptingTxn: false,
  //         withdrawFarmError: e.message,
  //         txHash: undefined
  //       })
  //     })
  // }, [stakedAmount])

  const renderApprovalOrStakeButton = () => {
    return isApproved ? (
      <>
        <StyledInternalLink to={`/farm/${farmingPoolInfo.pid}`} style={{ width: '100%' }}>
          <ButtonPrimary>{'Deposit LP'}</ButtonPrimary>
        </StyledInternalLink>
        {showWithdraw && (
          <RowBetween>
            {withdrawFarmError !== undefined && <TYPE.error error={true}>{withdrawFarmError}</TYPE.error>}
            <ButtonPrimary
              onClick={()=>{
                setIsFarmingModalOpen(true)
              }}
              width={'100%'}
            >
              {'Withdraw'}
            </ButtonPrimary>
          </RowBetween>
        )}
      </>
    ) : (
      <ButtonPrimary width={'100%'} disabled={requestedApproval} onClick={handleApprove}>
        {'Enable Contract'}
      </ButtonPrimary>
    )
  }

  return (
    <Wrapper showBackground={isStaking} bgColor={backgroundColor}>
      <CardBGImage desaturate />
      <CardNoise />
      <UnstakingFarmModal
        farmInfo={farmingPoolInfo}
        isOpen={isFarmingModalOpen}
        onDismiss={() => {
          setIsFarmingModalOpen(false)
        }}
      ></UnstakingFarmModal>
      <TopSection>
        <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={24} />
        <TYPE.white fontWeight={600} fontSize={24} style={{ marginLeft: '8px' }}>
          {currency0.symbol}-{currency1.symbol}
        </TYPE.white>
      </TopSection>
      <StatContainer>
        <RowBetween>
          <TYPE.white> Total deposited</TYPE.white>
          <TYPE.white>
            {farmingPoolInfo.userData === undefined
              ? `0`
              : farmingPoolInfo.userData!.stakedBalance === undefined
              ? `0`
              : new BigNumber(farmingPoolInfo.userData!.stakedBalance!)
                  .div(new BigNumber(10).pow(new BigNumber(18)))
                  .toFixed(10)}
          </TYPE.white>
        </RowBetween>
        <RowBetween>
          <TYPE.white> Total Liquidity Value</TYPE.white>
          <TYPE.white>{liquidityValueInUsdc.toString() + `USDC`}</TYPE.white>
        </RowBetween>
        <RowBetween>
          <TYPE.white> Multiplier </TYPE.white>
          <TYPE.white>{farmingPoolInfo.multiplier === undefined ? '-' : farmingPoolInfo.multiplier}</TYPE.white>
        </RowBetween>
        <>
          {showEarnReward && (
            <RowBetween>
              <TYPE.white> Unclaimed Reward WAR </TYPE.white>
              <TYPE.white>
                {farmingPoolInfo.userData === undefined
                  ? '-'
                  : farmingPoolInfo.userData!.earnings === undefined
                  ? '-'
                  : farmingPoolInfo.userData.earnings!.dividedBy(BIG_TEN.pow(18)).toString()}
              </TYPE.white>
            </RowBetween>
          )}
        </>

        <RowBetween>{!account ? <ConnectWalletButton /> : renderApprovalOrStakeButton()}</RowBetween>
      </StatContainer>
    </Wrapper>
  )
}
