import { useCallback } from 'react'
import { ethers, Contract } from 'ethers'
import { useMasterChefContract } from 'hooks/useContract'
import { useCallWithGasPrice } from 'hooks/useCallWithGasPrice'
import { useGasPrice, useGasPriceFromBlockchain } from 'state/user/hooks'

const useApproveFarm = (lpContract: Contract) => {
  const masterChefContract = useMasterChefContract()
  const { callWithGasPrice } = useCallWithGasPrice()
  const callGasPrice = useGasPriceFromBlockchain()
  useGasPrice()
  const handleApprove = useCallback(async () => {
    try {
      const gasPrice = await callGasPrice()
      const tx = await callWithGasPrice(
        lpContract,
        'approve',
        [masterChefContract?.address, ethers.constants.MaxUint256],
        {
          gasPrice: gasPrice
        }
      )
      const receipt = await tx.wait()
      return receipt.status
    } catch (e) {
      return false
    }
  }, [lpContract, masterChefContract, callWithGasPrice])

  return { onApprove: handleApprove }
}

export default useApproveFarm
