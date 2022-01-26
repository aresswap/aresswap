import { MASTER_CHEF_ADDRESS } from 'constants/addresses'
import { BigNumber, Contract } from 'ethers'
import { useActiveWeb3React } from 'hooks'
import { useMemo } from 'react'
import { useTransactionAdder } from 'state/transactions/hooks'
import { calculateGasMargin } from 'utils'
import { getMasterChefContract } from 'utils/contractHelper'
export enum DepositFarmState {
  INVALID,
  LOADING,
  VALID
}
interface SwapCall {
  contract: Contract
  parameters: {
    pid: number
    amount: string
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
export function useDepositFarm(
  pid: number,
  tokenName: string
): {
  state: DepositFarmState
  error: string | null
  callback: null | ((amount: string) => Promise<string>)
} {
  const { chainId, library } = useActiveWeb3React()
  const addTransaction = useTransactionAdder()
  return useMemo(() => {
    if (chainId === undefined) {
      return { state: DepositFarmState.INVALID, error: 'Chain Id null', callback: null }
    }
    const contract = getMasterChefContract(MASTER_CHEF_ADDRESS[chainId], library)
    return {
      state: DepositFarmState.VALID,
      error: null,
      callback: async function onDeposit(amount: string): Promise<string> {
        const args = [pid, amount]
        const method = 'deposit'
        const estimatedCalls: EstimatedDepositFarmCall = await contract.estimateGas[method](args)
          .then(gasEstimate => {
            return {
              call: {
                parameters: {
                  pid: pid,
                  amount: amount
                },
                contract: contract
              },
              gasEstimate: gasEstimate
            }
          })
          .catch(gasError => {
            console.debug('Gas estimate failed, trying eth_call to extract error', { args, method , contract})
            return {
              call: {
                parameters: {
                  pid: pid,
                  amount: amount
                },
                contract: contract
              },
              error: new Error('Unexpected issue with estimating the gas. Please try again.')
            }
          })
        const checkSuccessEstimateGass = (p: EstimatedDepositFarmCall): p is SuccessfulCall =>
          p.hasOwnProperty('gasEstimate')
        if (checkSuccessEstimateGass(estimatedCalls)) {
          throw new Error('Unexpected error. Please contact support: none of the calls threw an error')
        }
        return contract[method](args, {
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
