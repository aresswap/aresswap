import React from 'react'
import styled from 'styled-components'
import { escapeRegExp } from 'utils'

const StyledInput = styled.input<{ inputColor?: string; fontSize?:string }>`
  padding: 0.5em;
  margin: 0.5em;
  color: ${({ theme, inputColor }) => (inputColor === undefined ? theme.text1 : inputColor)};
  border: none;
  border-radius: 3px;
  background-color: ${({ theme }) => theme.bg1};
  font-size: ${({ fontSize }) => fontSize ?? '24px'};
  [type='number'] {
    -moz-appearance: textfield;
  }
`
interface AmountDepositProps {
  value: string | number
  inputColor?: string
  error: boolean
  onUserInput: (value: string) => void
}
const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`) // match escaped "." characters via in a non-capturing group

export function AmountDeposit({ value, inputColor, error, onUserInput }: AmountDepositProps) {
  const enforcer = (nextUserInput: string) => {
    if (nextUserInput === '' || inputRegex.test(escapeRegExp(nextUserInput))) {
      onUserInput(nextUserInput)
    }
  } 
  return (
    <StyledInput
      value={value}
      inputColor={error ? 'red' : inputColor}
      onChange={event => {
        enforcer(event.target.value)
      }}
      type="text"
    ></StyledInput>
  )
}
