import { WRAPPED_TOKEN, USDC, WAR } from 'constants/index'
import { SerializedFarmConfig } from 'state/farm/types'

const farms: SerializedFarmConfig[] = [
  {
    lpSymbol: 'Ares',
    lpAddresses: '0xec670571CC55Ac848bdcbe375883dB22D355ea45',
    pid: 0,
    baseToken: {
      chainId: 43113,
      address: '0xB24c774562c9aa96aE199a8D50bE11a5e3C54E39',
      decimals: 18,
      symbol: 'dWar',
      name: 'dWar'
    },
    quoteToken: {
      chainId: 43113,
      address: '0xc676516F9fFD816a13D4a763b13BC0385A3d6567',
      decimals: 18,
      symbol: 'WMETIS',
      name: 'Wrapped Metis'
    }
  },
  {
    lpSymbol: 'USDC-METIS',
    lpAddresses: '0x5255b7EF2204C0e80487791edD001db88B1b4953',
    pid: 1,
    baseToken: {
      chainId: USDC[43113].chainId,
      address: USDC[43113].address,
      decimals: USDC[43113].decimals,
      name: USDC[43113].name,
      symbol: USDC[43113].symbol
    },
    quoteToken: {
      address: WRAPPED_TOKEN[43113].address,
      chainId: WRAPPED_TOKEN[43113].chainId,
      decimals: WRAPPED_TOKEN[43113].decimals,
      name: WRAPPED_TOKEN[43113].name,
      symbol: WRAPPED_TOKEN[43113].symbol
    }
  },
  {
    lpSymbol: 'METIS-WAR',
    lpAddresses: '0x3E107323D621C708289aDBbC7D68112700005ea4',
    pid: 2,
    baseToken: {
      address: WRAPPED_TOKEN[43113].address,
      chainId: WRAPPED_TOKEN[43113].chainId,
      decimals: WRAPPED_TOKEN[43113].decimals,
      name: WRAPPED_TOKEN[43113].name,
      symbol: WRAPPED_TOKEN[43113].symbol
    },
    quoteToken: {
      address: WAR[43113].address,
      chainId: WAR[43113].chainId,
      decimals: WAR[43113].decimals,
      name: WAR[43113].name,
      symbol: WAR[43113].symbol
    }
  }
]

export default farms
