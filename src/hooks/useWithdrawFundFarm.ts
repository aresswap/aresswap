import { BigNumber, Contract } from 'ethers'
import { useActiveWeb3React } from 'hooks'
import { useMemo } from 'react'
import { useTransactionAdder } from 'state/transactions/hooks'
import { calculateGasMargin } from 'utils'
import { useMasterChefContract } from './useContract'
export enum WithdrawFarmState {
  INVALID,
  LOADING,
  VALID
}
interface SwapCall {
  contract: Contract
  parameters: {
    pid: number
    amount: BigNumber
  }
}

interface SuccessfulCall {
  call: SwapCall
  gasEstimate: BigNumber
}

interface FailedCall {
  call: SwapCall
  error: Error
}
type EstimatedDepositFarmCall = SuccessfulCall | FailedCall
export function useWithdrawFundFarm(
  pid: number,
  tokenName: string
): {
  state: WithdrawFarmState
  error: string | null
  callback: null | ((amount: string) => Promise<string>)
} {
  const { chainId, library } = useActiveWeb3React()
  const addTransaction = useTransactionAdder()
  const contract = useMasterChefContract();
  return useMemo(() => {
    if (contract === undefined || contract ===null) {
      return { state: WithdrawFarmState.INVALID, error: 'contract', callback: null }
    }
    return {
      state: WithdrawFarmState.VALID,
      error: null,
      callback: async function onDeposit(amount: string): Promise<string> {
        const args = [BigNumber.from(pid)._hex, BigNumber.from(amount)._hex]
        const method = 'withdraw'
        const estimatedCalls: EstimatedDepositFarmCall = await contract.estimateGas[method](args[0],args[1])
          .then(gasEstimate => {
            return {
              call: {
                parameters: {
                  pid: pid,
                  amount: BigNumber.from(amount)
                },
                contract: contract
              },
              gasEstimate: gasEstimate
            }
          })
          .catch(gasError => {
            console.debug('Gas estimate failed, trying eth_call to extract error ', { gasError, args, method , contract})
            return {
              call: {
                parameters: {
                  pid: pid,
                  amount: BigNumber.from(amount)
                },
                contract: contract
              },
              error: new Error('Unexpected issue with estimating the gas. Please try again.')
            }
          })
        const checkSuccessEstimateGass = (p: EstimatedDepositFarmCall): p is SuccessfulCall =>
          p.hasOwnProperty('gasEstimate')
        if (!checkSuccessEstimateGass(estimatedCalls)) {
          throw new Error('Unexpected error. Please contact support: none of the calls threw an error')
        }
        return contract[method](args[0],args[1], {
          gasLimit: calculateGasMargin(((estimatedCalls as unknown) as SuccessfulCall).gasEstimate)
        })
          .then((response: any) => {
            addTransaction(response, {
              summary: `Depositing LP ${tokenName} to farm`
            })
            return response.hash
          })
          .catch((depositeError: any) => {
            // if the user rejected the tx, pass this along
            if (depositeError?.code === 4001) {
              throw new Error('Transaction rejected.')
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`Deposit Farm failed`, depositeError, method, args)
              throw new Error(`Deposit Farm failed: ${depositeError.message}`)
            }
          })
      }
    }
  }, [chainId, library])
}
