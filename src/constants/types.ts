import BigNumber from 'bignumber.js'

BigNumber.config({
    EXPONENTIAL_AT:[-10, 40]
})
export const BIG_ZERO : BigNumber = new BigNumber(0)
export const BIG_TEN : BigNumber = new BigNumber(10)
export const BIG_ONE : BigNumber = new BigNumber(1)
export type SerializedBigNumber = string
