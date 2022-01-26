import abi from 'constants/abis/Multicall.json'
import {abi as masterChefAbi} from 'constants/abis/master-chef-contract.json'
import {  ethers } from 'ethers'
import { simpleRpcProvider } from './provider'
export const getMulticallContract = (address:string, signer?: ethers.Signer | ethers.providers.Provider) => {
  return getContract(abi, address, signer)
}
export const getMasterChefContract= (address:string, signer?: ethers.Signer | ethers.providers.Provider) => {
  return getContract(masterChefAbi, address, signer)
}
const getContract = (abi: any, address: string, signer?: ethers.Signer | ethers.providers.Provider) => {
  const signerOrProvider = signer ?? simpleRpcProvider
  return new ethers.Contract(address, abi, signerOrProvider)
}