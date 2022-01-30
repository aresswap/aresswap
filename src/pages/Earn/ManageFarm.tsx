import React, { useCallback, useState } from 'react'
import { AutoColumn } from '../../components/Column'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
//import BigNumber from 'bignumber.js'
import { useTotalSupply } from 'data/TotalSupply'

import { JSBI, TokenAmount, ETHER, Token } from '@uniswap/sdk'
import { RouteComponentProps } from 'react-router-dom'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
//import { useWalletModalToggle } from '../../state/application/hooks'
import { TYPE } from '../../theme'

import { RowBetween } from '../../components/Row'
import { CardSection, DataCard, CardNoise, CardBGImage } from '../../components/earn/styled'
import { ButtonError2, ButtonPrimary } from '../../components/Button'

//import { wrappedCurrency } from '../../utils/wrappedCurrency'
import { currencyId } from '../../utils/currencyId'
import { usePair } from '../../data/Reserves'
import useUSDCPrice from '../../utils/useUSDCPrice'
//import { BIG_INT_ZERO, BIG_INT_SECONDS_IN_WEEK } from '../../constants'
import { useFarmFromPid } from 'state/farm/hooks'
import { useActiveWeb3React } from 'hooks'
import { useColor } from 'hooks/useColor'
import { useTokenBalance } from 'state/wallet/hooks'
import { BIG_TEN } from 'constants/types'
import { DeserializedFarm } from 'state/farm/types'
import { AmountDeposit } from 'components/FarmComponents/AmountDeposit'
import { useDepositFarm } from 'hooks/useDepositFarm'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/farm'
const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const PositionInfo = styled(AutoColumn)<{ dim: any }>`
  position: relative;
  max-width: 640px;
  width: 100%;
  opacity: ${({ dim }) => (dim ? 0.6 : 1)};
`

const BottomSection = styled(AutoColumn)`
  border-radius: 12px;
  width: 100%;
  position: relative;
`

const StyledDataCard = styled(DataCard)<{ bgColor?: any; showBackground?: any }>`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #1e1a31 0%, #3d51a5 100%);
  z-index: 2;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%,  ${showBackground ? theme.black : theme.bg5} 100%) `};
`

// const StyledBottomCard = styled(DataCard)<{ dim: any }>`
//   background: ${({ theme }) => theme.bg3};
//   opacity: ${({ dim }) => (dim ? 0.4 : 1)};
//   margin-top: -40px;
//   padding: 0 1.25rem 1rem 1.25rem;
//   padding-top: 32px;
//   z-index: 1;
// `

const PoolData = styled(DataCard)`
  background: none;
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 1rem;
  z-index: 1;
`

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #27ae60 0%, #000000 100%);
  overflow: hidden;
`

const DataRow = styled(RowBetween)`
  justify-content: center;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    gap: 12px;
  `};
`
export default function ManageFarm({
  match: {
    params: { pid }
  }
}: RouteComponentProps<{ pid: string }>) {
  const dispatch = useAppDispatch()
  const { account } = useActiveWeb3React()
  const farmPool = useFarmFromPid(Number(pid))
  //const toggleWalletModal = useWalletModalToggle()
  const currencyA = farmPool.baseToken
  const currencyB = farmPool.quoteToken
  //const token0Price = useUSDCPrice(currencyA)?.toFixed(currencyA.decimals)
  //const token1Price = useUSDCPrice(currencyB)?.toFixed(currencyB.decimals)
  const [, farmingTokenPair] = usePair(farmPool.baseToken, farmPool.quoteToken)
  const token = currencyA === ETHER ? farmPool.quoteToken : farmPool.baseToken
  const WETH = currencyA === ETHER ? farmPool.baseToken : farmPool.quoteToken
  const backgroundColor = useColor(token)
  // modal and loading
  //, depositErrorMessage, attemptingTxn, txHash
  const [{ showDepositConfirm, depositErrorMessage, depositeToConfirm }, setDepositFarmState] = useState<{
    showDepositConfirm: boolean
    depositeToConfirm: DeserializedFarm | undefined
    attemptingTxn: boolean
    depositErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showDepositConfirm: false,
    depositeToConfirm: undefined,
    attemptingTxn: false,
    depositErrorMessage: undefined,
    txHash: undefined
  })
  const [depositValue, setDepositValue] = useState('0')
  let valueOfTotalStakedAmountInWETH: TokenAmount | undefined
  const lpToken = new Token(
    farmPool.baseToken.chainId,
    farmPool.lpAddresses,
    18,
    `${farmPool.baseToken.symbol}-${farmPool.quoteToken.symbol}`
  )
  const stakedAmount =
    farmPool.userData === undefined
      ? '0'
      : farmPool.userData!.stakedBalance === undefined
      ? '0'
      : farmPool.userData!.stakedBalance.dividedBy(BIG_TEN.pow(18)).toString()
  // get WETH value of staked LP tokens
  const totalSupplyOfStakingToken = useTotalSupply(lpToken)
  if (totalSupplyOfStakingToken && farmingTokenPair && farmPool && WETH) {
    // take the total amount of LP tokens staked, multiply by ETH value of all LP tokens, divide by all LP tokens
    valueOfTotalStakedAmountInWETH = new TokenAmount(
      WETH,
      JSBI.divide(
        JSBI.multiply(
          JSBI.multiply(
            JSBI.BigInt(
              farmPool.userData === undefined
                ? '0'
                : farmPool.userData.stakedBalance === undefined
                ? '0'
                : farmPool.userData.stakedBalance.toString()
            ),
            farmingTokenPair.reserveOf(WETH).raw
          ),
          JSBI.BigInt(2) // this is b/c the value of LP shares are ~double the value of the WETH they entitle owner to
        ),
        totalSupplyOfStakingToken.raw
      )
    )
  }
  // const liquidityValueInUsdc =
  //   token1Price === undefined || token0Price === undefined
  //     ? new BigNumber(0)
  //     : new BigNumber(token0Price).plus(new BigNumber(token1Price))
  // get the USD value of staked WETH
  const USDPrice = useUSDCPrice(WETH)
  const valueOfTotalStakedAmountInUSDC =
    valueOfTotalStakedAmountInWETH && USDPrice?.quote(valueOfTotalStakedAmountInWETH)

  const userLiquidityUnstaked = useTokenBalance(account ?? undefined, lpToken)
  const showAddLiquidityButton = Boolean(stakedAmount === '0' && userLiquidityUnstaked?.equalTo('0'))
  // fade cards if nothing staked or nothing earned yet
  const disableTop = !farmPool.userData?.stakedBalance || stakedAmount === '0'
  const { callback: depositCallback, error: depositCallbackError } = useDepositFarm(
    Number.parseInt(pid),
    `LP ${farmPool.baseToken.symbol}-${farmPool.quoteToken.symbol} Token`
  )
  const onUserInputCallback = () => {
    if (showDepositConfirm) {
      console.log(`Deposit value ${depositValue}`)
      let error: string | undefined = undefined
      if (JSBI.equal(JSBI.BigInt(depositValue), JSBI.BigInt(0))) {
        error = 'Cannot deposit zero amount'
      } else if (
        JSBI.greaterThan(
          JSBI.BigInt(depositValue),
          userLiquidityUnstaked === undefined || userLiquidityUnstaked === null
            ? JSBI.BigInt(0)
            : userLiquidityUnstaked!.raw
        )
      ) {
        error = 'Amount to deposit bigger than you have'
      }
      setDepositFarmState({
        showDepositConfirm: true,
        depositeToConfirm: farmPool,
        attemptingTxn: false,
        depositErrorMessage: error,
        txHash: undefined
      })
    } else {
      setDepositFarmState({
        showDepositConfirm: true,
        depositeToConfirm: farmPool,
        attemptingTxn: false,
        depositErrorMessage: undefined,
        txHash: undefined
      })
    }
  }
  const handleDeposit = useCallback(() => {
    onUserInputCallback();
    if (!depositCallback) {
      return
    }
    setDepositFarmState({
      showDepositConfirm: showDepositConfirm,
      depositeToConfirm: depositeToConfirm,
      attemptingTxn: true,
      depositErrorMessage: undefined,
      txHash: undefined
    })
    console.log(`depositValue ${depositValue}`);
    depositCallback(depositValue)
      .then(hash => {
        setDepositFarmState({
          showDepositConfirm: showDepositConfirm,
          depositeToConfirm: depositeToConfirm,
          attemptingTxn: false,
          depositErrorMessage: undefined,
          txHash: hash
        })
        setDepositValue('0');
        if(account !== undefined && account !== null){
          dispatch(fetchFarmUserDataAsync({account:account,pids:[farmPool.pid]}))
        }
      })
      .catch(error => {
        setDepositFarmState({
          showDepositConfirm: showDepositConfirm,
          depositeToConfirm: depositeToConfirm,
          attemptingTxn: false,
          depositErrorMessage: error.message,
          txHash: undefined
        })
      })
  }, [depositValue])
  return (
    <PageWrapper gap="lg" justify="center">
      <RowBetween style={{ gap: '24px' }}>
        <TYPE.mediumHeader style={{ margin: 0 }}>
          {currencyA?.symbol}-{currencyB?.symbol} Liquidity Mining
        </TYPE.mediumHeader>
        <DoubleCurrencyLogo currency0={currencyA ?? undefined} currency1={currencyB ?? undefined} size={24} />
      </RowBetween>

      <DataRow style={{ gap: '24px' }}>
        <PoolData>
          <AutoColumn gap="sm">
            <TYPE.body style={{ margin: 0 }}>Total deposits</TYPE.body>
            <TYPE.body fontSize={24} fontWeight={500}>
              {valueOfTotalStakedAmountInUSDC
                ? `$${valueOfTotalStakedAmountInUSDC.toFixed(0, { groupSeparator: ',' })}`
                : `${valueOfTotalStakedAmountInWETH?.toSignificant(4, { groupSeparator: ',' }) ?? '-'} ETH`}
            </TYPE.body>
          </AutoColumn>
        </PoolData>
        <PoolData>
          <AutoColumn gap="sm">
            <TYPE.body style={{ margin: 0 }}>Liquidity Value</TYPE.body>
            <TYPE.body fontSize={24} fontWeight={500}>
              {/* Need to do */}
              {'0 WAR'}
            </TYPE.body>
          </AutoColumn>
        </PoolData>
      </DataRow>

      {showAddLiquidityButton && (
        <VoteCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>Step 1. Get UNI-V2 Liquidity tokens</TYPE.white>
              </RowBetween>
              <RowBetween style={{ marginBottom: '1rem' }}>
                <TYPE.white fontSize={14}>
                  {`UNI-V2 LP tokens are required. Once you've added liquidity to the ${currencyA?.symbol}-${currencyB?.symbol} pool you can stake your liquidity tokens on this page.`}
                </TYPE.white>
              </RowBetween>
              <ButtonPrimary
                padding="8px"
                borderRadius="8px"
                width={'fit-content'}
                as={Link}
                to={`/add/${currencyA && currencyId(currencyA)}/${currencyB && currencyId(currencyB)}`}
              >
                {`Add ${currencyA?.symbol}-${currencyB?.symbol} liquidity`}
              </ButtonPrimary>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </VoteCard>
      )}
      {/* <UnstakingModal
            isOpen={showUnstakingModal}
            onDismiss={() => setShowUnstakingModal(false)}
            stakingInfo={stakingInfo}
          />
          <ClaimRewardModal
            isOpen={showClaimRewardModal}
            onDismiss={() => setShowClaimRewardModal(false)}
            stakingInfo={stakingInfo}
          /> */}

      <PositionInfo gap="lg" justify="center" dim={showAddLiquidityButton}>
        <BottomSection gap="lg" justify="center">
          <StyledDataCard disabled={disableTop} bgColor={backgroundColor} showBackground={!showAddLiquidityButton}>
            <CardSection>
              <CardBGImage desaturate />
              <CardNoise />
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>Your liquidity deposits</TYPE.white>
                </RowBetween>
                <RowBetween style={{ alignItems: 'baseline' }}>
                  <TYPE.white fontSize={36} fontWeight={600}>
                    {stakedAmount ?? '-'}
                  </TYPE.white>
                  <TYPE.white>
                    AresSwap {currencyA?.symbol}-{currencyB?.symbol}
                  </TYPE.white>
                </RowBetween>
              </AutoColumn>
            </CardSection>
          </StyledDataCard>
          {/* <StyledBottomCard dim={stakingInfo?.stakedAmount?.equalTo(JSBI.BigInt(0))}>
            <CardBGImage desaturate />
            <CardNoise />
            <AutoColumn gap="sm">
              <RowBetween>
                <div>
                  <TYPE.black>Your unclaimed WAR</TYPE.black>
                </div>
                {stakingInfo?.earnedAmount && JSBI.notEqual(BIG_INT_ZERO, stakingInfo?.earnedAmount?.raw) && (
                  <ButtonEmpty
                    padding="8px"
                    borderRadius="8px"
                    width="fit-content"
                    onClick={() => setShowClaimRewardModal(true)}
                  >
                    Claim
                  </ButtonEmpty>
                )}
              </RowBetween>
              <RowBetween style={{ alignItems: 'baseline' }}>
                <TYPE.largeHeader fontSize={36} fontWeight={600}>
                  <CountUp
                    key={countUpAmount}
                    isCounting
                    decimalPlaces={4}
                    start={parseFloat(countUpAmountPrevious)}
                    end={parseFloat(countUpAmount)}
                    thousandsSeparator={','}
                    duration={1}
                  />
                </TYPE.largeHeader>
                <TYPE.black fontSize={16} fontWeight={500}>
                  <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px ' }}>
                    ⚡
                  </span>
                  {stakingInfo?.active
                    ? stakingInfo?.rewardRate
                        ?.multiply(BIG_INT_SECONDS_IN_WEEK)
                        ?.toSignificant(4, { groupSeparator: ',' }) ?? '-'
                    : '0'}
                  {' UNI / week'}
                </TYPE.black>
              </RowBetween>
            </AutoColumn>
          </StyledBottomCard> */}
        </BottomSection>
        <TYPE.main style={{ textAlign: 'center' }} fontSize={14}>
          <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px' }}>
            ⭐️
          </span>
          When you withdraw, the contract will automagically claim WAR on your behalf!
        </TYPE.main>
        <>
          {showDepositConfirm && (
            <>
              <AmountDeposit
                value={depositValue}
                onUserInput={(value: string) => {
                  setDepositValue(value)
                  
                }}
                error={
                  userLiquidityUnstaked === undefined
                    ? false
                    : userLiquidityUnstaked!.greaterThan(JSBI.BigInt(depositValue))
                }
              ></AmountDeposit>
            </>
          )}
        </>
        <>{depositErrorMessage !== undefined && <TYPE.error error={true}>{depositErrorMessage}</TYPE.error>}</>
        {!showAddLiquidityButton && userLiquidityUnstaked !== undefined && (
          <DataRow style={{ gap: '24px' }}>
            {showDepositConfirm && (
              <ButtonError2
                padding="8px"
                borderRadius="8px"
                width="160px"
                error={true}
                onClick={() => {
                  setDepositFarmState({
                    showDepositConfirm: false,
                    depositeToConfirm: undefined,
                    attemptingTxn: false,
                    depositErrorMessage: undefined,
                    txHash: undefined
                  })
                }}
              >
                Cancel
              </ButtonError2>
            )}
            <ButtonPrimary
              padding="8px"
              borderRadius="8px"
              width="160px"
              disabled={depositCallbackError !== undefined && depositCallbackError !== null}
              onClick={() => {
                // handleDeposit()
                if(depositeToConfirm !== undefined){
                  handleDeposit();
                } else{
                  setDepositFarmState({
                    showDepositConfirm: true,
                    depositeToConfirm: farmPool,
                    attemptingTxn: false,
                    depositErrorMessage: undefined,
                    txHash: undefined
                  })
                }
              }}
            >
              Deposit
            </ButtonPrimary>

            {/* {stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) && (
              <>
                <ButtonPrimary
                  padding="8px"
                  borderRadius="8px"
                  width="160px"
                  onClick={() => setShowUnstakingModal(true)}
                >
                  Withdraw
                </ButtonPrimary>
              </>
            )} */}
          </DataRow>
        )}
        {!userLiquidityUnstaked ? null : userLiquidityUnstaked.equalTo('0') ? null : (
          <TYPE.main>
            {userLiquidityUnstaked.toSignificant(6)} {farmPool.baseToken.symbol}-{farmPool.quoteToken.symbol} LP tokens
            available
          </TYPE.main>
        )}
      </PositionInfo>
    </PageWrapper>
  )
}
