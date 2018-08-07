export const name = 'register'
export const uri = 'https://github.com/thomsbg/ottypes/register'

export function create(val) {
  return val
}

export function apply(prev, val) {
  return val
}

export function transform(a, b, side) {
  return side === 'left' ? a : b
}

export function compose(a, b) {
  return b
}
