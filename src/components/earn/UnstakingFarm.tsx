import React, { useState } from 'react'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon } from '../../theme'
import { ButtonError } from '../Button'
import { useMasterChefContract } from '../../hooks/useContract'
import { SubmittedView, LoadingView } from '../ModalViews'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useActiveWeb3React } from '../../hooks'
import { FarmWithStakedValue } from 'state/farm/types'
import { BIG_TEN } from 'constants/types'
import FormattedCurrencyAmount from '../FormattedCurrencyAmount'
import { CurrencyAmount } from '@uniswap/sdk'
import { BigNumber } from 'ethers'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  farmInfo: FarmWithStakedValue
}

export default function UnstakingFarmModal({ isOpen, onDismiss, farmInfo }: StakingModalProps) {
  const { account } = useActiveWeb3React()

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  function wrappedOndismiss() {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  const masterChefContract = useMasterChefContract()

  async function onWithdraw() {
      console.log('on withdraw')
    if (
      masterChefContract !== undefined &&
      masterChefContract !== null &&
      farmInfo.userData !== undefined &&
      farmInfo.userData!.stakedBalance !== undefined
    ) {
      setAttempting(true)
      await masterChefContract
        .withdraw(farmInfo.pid, BigNumber.from(farmInfo.userData!.stakedBalance!.toString()), { gasLimit: 300000 })
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            summary: `Withdraw deposited liquidity`
          })
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(`on withdraw error ${error}`)
        })
    }
  }

  let error: string | undefined
  if (!account) {
    error = 'Connect Wallet'
  }
  if (farmInfo.userData === undefined || farmInfo.userData!.stakedBalance === undefined) {
    error = error ?? 'Enter an amount'
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>Withdraw</TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOndismiss} />
          </RowBetween>
          {farmInfo.userData !== undefined && farmInfo.userData!.stakedBalance !== undefined && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {
                  <FormattedCurrencyAmount
                    currencyAmount={CurrencyAmount.ether(farmInfo.userData?.stakedBalance?.toString())}
                  ></FormattedCurrencyAmount>
                }
                {}
              </TYPE.body>
              <TYPE.body>Deposited liquidity:</TYPE.body>
            </AutoColumn>
          )}
          {farmInfo.userData !== undefined && farmInfo.userData!.earnings !== undefined && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {farmInfo.userData!.earnings!.div(BIG_TEN.pow(18)).toString()}
              </TYPE.body>
              <TYPE.body>Unclaimed WAR</TYPE.body>
            </AutoColumn>
          )}
          <TYPE.subHeader style={{ textAlign: 'center' }}>
            When you withdraw, your WAR is claimed and your liquidity is removed from the farm pool.
          </TYPE.subHeader>
          <ButtonError disabled={!!error} error={!!error && !!farmInfo.userData?.stakedBalance} onClick={onWithdraw}>
            {error ?? 'Withdraw & Claim'}
          </ButtonError>
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOndismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.body fontSize={20}>
              Withdrawing {farmInfo.userData?.stakedBalance?.div(BIG_TEN.pow(18)).toString()}{' '}
              {`LP ${farmInfo.baseToken.symbol}-${farmInfo.quoteToken.symbol}`}
            </TYPE.body>
            <TYPE.body fontSize={20}>
              Claiming {farmInfo.userData!.earnings!.div(BIG_TEN.pow(18)).toString()} WAR
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={wrappedOndismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>Transaction Submitted</TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              Withdrew {`LP ${farmInfo.baseToken.symbol}-${farmInfo.quoteToken.symbol}`}!
            </TYPE.body>
            <TYPE.body fontSize={20}>Claimed WAR!</TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
