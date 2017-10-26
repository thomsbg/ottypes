const EMPTY = []
export const name = 'set'
export const uri = 'https://github.com/thomsbg/ottypes/set'

export function create(items) {
  return new Set(items)
}

export function serialize(set) {
  return [...set].sort()
}

export function deserialize(ary) {
  return new Set(ary)
}

export function normalize(delta) {
  // ensure that nothing in 'add' appears in 'del'
  let add = difference(delta.add, delta.del).sort()
  let del = [...delta.del].sort()
  return { add, del }
}

export function apply(set, delta) {
  for (let item of delta.add) { set.add(item) }
  for (let item of delta.del) { set.delete(item) }
  return set
}

export function compose(a, b) {
  let add = union(a.add, b.add)
  let del = union(difference(a.del, b.add), b.del)
  return normalize({ add, del })
}

export function transform(a, b, side) {
  // eliminate redundant add + add or delete + delete
  let add = difference(a.add, b.add)
  let del = difference(a.del, b.del)

  // use tiebreaker to determine which side to prefer in case of concurrent add + delete
  if (side != 'left') {
    add = difference(a.add, b.del)
    del = difference(a.del, b.add)
  }

  return { add, del }
}

function union(a, b) {
  let result = new Set(a)
  for (let item of b) {
    result.add(item)
  }
  return [...result]
}

function difference(a, b) {
  let result = new Set(a)
  for (let item of b) {
    result.delete(item)
  }
  return [...result]
}
