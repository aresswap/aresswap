import { CallOverrides, Contract, ethers } from "ethers"
import { get } from "lodash"
import { useCallback } from "react"
import { useGasPrice } from "state/user/hooks"

export function useCallWithGasPrice() {
    const gasPrice = useGasPrice()
  
    const callWithGasPrice = useCallback(
      async (
        contract: Contract,
        methodName: string,
        methodArgs: any[] = [],
        overrides?: CallOverrides | undefined,
      ): Promise<ethers.providers.TransactionResponse> => {
        const contractMethod = get(contract, methodName)
        const hasManualGasPriceOverride = overrides?.gasPrice
  
        const tx = await contractMethod(
          ...methodArgs,
          hasManualGasPriceOverride ? { ...overrides } : { ...overrides, gasPrice },
        )
  
        return tx
      },
      [gasPrice],
    )
  
    return { callWithGasPrice }
  }