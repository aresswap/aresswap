import { ChainId } from '@uniswap/sdk'
import MULTICALL_ABI from './abi.json'

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0x1E04Ff74966BC1d3253289909BDcd62A6c8D2b7A',
  [ChainId.ROPSTEN]: '0xccc75e78Dce6A20bCCa3a30deB23Cb4D23df993a',
}

export { MULTICALL_ABI, MULTICALL_NETWORKS }
