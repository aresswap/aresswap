import { ChainId } from "@uniswap/sdk";


export const MASTER_CHEF_ADDRESS : {[chainId in ChainId] : string} = {
    [ChainId.ROPSTEN] : "0x023E2aCfe2f55b75E47801Cf4a9551D9A2B0A9AA",
    [ChainId.MAINNET] : "0x4E2db1300FfdAa052f033b531a7911b478Df8471"
}