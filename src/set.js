const name = 'set'

function create(items) {
  return new Set(items)
}

function serialize(set) {
  return [...set]
}

function deserialize(items) {
  return new Set(items)
}

function apply(set, delta) {
  for (const item of delta.add) {
    set.add(item)
  }
  for (const item of delta.del) {
    set.delete(item)
  }
}

function compose(a, b) {
  return {
    add: new Set([...a.add, ...b.add]),
    del: new Set([...a.del, ...b.del])
  }
}

function transform(a, b, side) {
  if (side == 'left') {
    return {
      add: new Set([...a.add].filter(x => !b.add.has(x))),
      del: new Set([...a.del].filter(x => !b.del.has(x)))
    }
  } else {
    return {
      add: new Set([...a.add].filter(x => !b.add.has(x) && !b.del.has(x))),
      del: new Set([...b.del].filter(x => !b.add.has(x) && !b.del.has(x)))
    }
  }
}

export { name, create, serialize, deserialize, apply, compose, transform }
