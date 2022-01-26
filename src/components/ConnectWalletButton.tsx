import React from 'react'
import { ButtonLight } from './Button'
import { useWalletModalToggle } from 'state/application/hooks'

const ConnectWalletButton = () => {
  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()
  return <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
}
export default ConnectWalletButton
