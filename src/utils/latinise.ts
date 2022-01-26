export const Latinise = {
  latin_map: {
    τ: 't',
    Τ: 'T'
  }
}

export const latinise = (input: string) => {
  return input.replace(/[^A-Za-z0-9[\] ]/g, x => {
    return x === 't' ? 't' : 'T'
  })
}
