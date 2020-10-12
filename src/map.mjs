export const name = 'map';
export const uri = 'https://github.com/thomsbg/ottypes/map'

export function create(entries) {
  return new Map(entries)
}

export function serialize(map) {
  return [...map]
}

export function deserialize(entries) {
  return new Map(entries)
}

export function normalize({ add, del }) {
  del = new Set(del)
  add = new Map(add)
  for (let k of del) { add.delete(k) }
  return { add: [...add], del: [...del] }
}

export function apply(map, { add, del }) {
  map = new Map(map)
  for (let [k, v] of add) { map.set(k, v) }
  for (let k of del) { map.delete(k) }
  return map
}

export function compose(a, b) {
  // Start with B
  let add = new Map(b.add)
  let del = new Set(b.del)
  // Add dels from A unless they conflict with adds from B
  for (let k of a.del) {
    if (!add.has(k) && !del.has(k)) { del.add(k) }
  }
  // Add adds from A unless they conflict with dels from B
  for (let [k, v] of a.add) {
    if (!add.has(k) && !del.has(k)) { add.set(k, v) }
  }
  return { add: [...add], del: [...del] }
}

export function transform(a, b, side) {
  let add = new Map(a.add)
  let del = new Set(a.del)
  if (side != 'left') {
    for (let [k, v] of b.add) {
      // we both added
      if (add.has(k)) { add.delete(k) }
      // we deleted they added
      del.delete(k)
    }
    // we added they deleted
    for (let k of b.del) {
      add.delete(k)
    }
  }
  return { add: [...add], del: [...del] }
}
