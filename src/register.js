const name = 'register'

function create(val) {
  return val
}

function apply(prev, val) {
  return val
}

function transform(a, b, side) {
  return side === 'left' ? a : b
}

function compose(a, b) {
  return b
}

export { name, create, apply, transform, compose }
