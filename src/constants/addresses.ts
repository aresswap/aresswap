import { ChainId } from "@uniswap/sdk";


export const MASTER_CHEF_ADDRESS : {[chainId in ChainId] : string} = {
    [ChainId.ROPSTEN] : "0x2B9b6566762569a4A7daDa91F00eEb1F09A924F0",
    [ChainId.MAINNET] : "0x2B9b6566762569a4A7daDa91F00eEb1F09A924F0"
}