const name = 'set'
const EMPTY = []

function create(items) {
  return new Set(items)
}

function serialize(set) {
  return [...set]
}

function deserialize(ary) {
  return new Set(ary)
}

function apply(set, delta) {
  let { add, del } = delta
  add.forEach(set.add, set)
  del.forEach(set.delete, set)
  return set
}

function compose(a, b) {
  let add = union(difference(a.add, b.del), b.add)
  let del = union(difference(a.del, b.add), b.del)
  return { add, del }
}

function transform(a, b, side) {
  if (side == 'left') {
    return a
  } else {
    let bAll = union(b.add, b.del)
    let add = difference(a.add, bAll)
    let del = difference(a.del, bAll)
    return { add, del }
  }
}

function diff(a, b) {
  let add = difference(b, a)
  let del = difference(a, b)
  return { add, del }
}

function union(a, b) {
  let result = new Set(a)
  for (let el of b) {
    result.add(el)
  }
  return [...result]
}

function difference(a, b) {
  let result = new Set(a)
  b = new Set(b)
  for (let el of b) {
    if (b.has(el)) result.delete(el)
  }
  return [...result]
}

module.exports = { name, create, serialize, deserialize, apply, compose, transform, diff }
