import { BIG_TEN } from 'constants/types'
import BigNumber from 'bignumber.js'

export const getBalanceAmount = (amount: BigNumber, decimals = 18) => {
  return new BigNumber(amount).div(BIG_TEN.pow(decimals))
}
