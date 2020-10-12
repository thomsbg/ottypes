import test from 'tape'
import fuzzer, { randomInt, randomReal, randomWord } from '@thomsbg/ot-fuzzer'
import { set as type } from '@thomsbg/ottypes'

test('set.create', t => {
  let set = type.create()
  t.ok(set)
  t.ok(set instanceof Set)
  set = type.create([1,2,3])
  t.ok(set)
  t.ok(set instanceof Set)
  t.deepEqual([...set], [1,2,3])
  t.end()
})

test('set.normalize', t => {
  [
    {
      delta: { add: [1], del: [2] },
      result: { add: [1], del: [2] }
    },
    {
      delta: { add: [2,3,1], del: [5,4] },
      result: { add: [1,2,3], del: [4,5] }
    },
    {
      delta: { add: [3,2,1], del: [3] },
      result: { add: [1,2], del: [3] }
    }
  ].forEach(({ delta, result }) => {
    t.deepEqual(type.normalize(delta), result)
  })
  t.end()
})

test('set.serialize', t => {
  [
    {
      input: new Set([3,2,1]),
      result: [1,2,3]
    }
  ].forEach(({ input, result }) => {
    t.deepEqual(type.serialize(input), result)
  })
  t.end()
})

test('set.deserialize', t => {
  [
    {
      input: [1,2,2,3,3,1],
      result: new Set([1,2,3])
    }
  ].forEach(({ input, result }) => {
    t.ok(result instanceof Set)
    for (let x of input) { t.ok(result.has(x)) }
  })
  t.end()
})

test('set.apply', t => {
  [
    { snapshot: [],  delta: { add: [1], del: [] },  result: [1] },
    { snapshot: [1], delta: { add: [],  del: [1] }, result: [] },
    { snapshot: [1], delta: { add: [2], del: [1] }, result: [2] },
    { snapshot: [1], delta: { add: [1], del: [1] }, result: [] }
  ].forEach(({ snapshot, delta, result }, index) => {
    t.deepEqual(type.apply(type.create(snapshot), delta), type.create(result))
  })
  t.end()
})

test('set.compose', t => {
  [
    {
      a: { add: [], del: [] },
      b: { add: [], del: [] },
      result: { add: [], del: [] }
    },
    {
      a: { add: [1], del: [] },
      b: { add: [1], del: [] },
      result: { add: [1], del: [] }
    },
    {
      a: { add: [1], del: [] },
      b: { add: [], del: [2] },
      result: { add: [1], del: [2] }
    },
    {
      a: { add: [1], del: [] },
      b: { add: [1,2], del: [3] },
      result: { add: [1,2], del: [3] }
    },
    {
      a: { add: [1,2], del: [3] },
      b: { add: [3,4], del: [1] },
      result: { add: [2,3,4], del: [1] }
    }
  ].forEach(({ a, b, result }) => {
    t.deepEqual(type.normalize(type.compose(a, b)), type.normalize(result))
  })
  t.end()
})

test('set.transform', t => {
  [
    {
      base: [],
      a: { add: [], del: [] },
      b: { add: [], del: [] },
      result: []
    },
    {
      base: [2],
      a: { add: [1], del: [2] },
      b: { add: [1], del: [2] },
      result: [1]
    },
    {
      base: [1, 2],
      a: { add: [1], del: [2] },
      b: { add: [1], del: [2] },
      result: [1]
    },
    {
      base: [2,3,4],
      a: { add: [1,2], del: [] },
      b: { add: [1],   del: [2] },
      result: [1,3,4]
    },
    {
      base: [3,4],
      a: { add: [], del: [1,2] },
      b: { add: [1,2], del: [] },
      result: [3,4]
    },
    {
      base: [3,4],
      a: { add: [3,5], del: [4] },
      b: { add: [4], del: [5] },
      result: [3,4,5]
    }
  ].forEach(({ base, a, b, result }) => {
    let aThenB = type.apply(type.apply(type.create(base), a), type.transform(b, a, 'left'))
    let bThenA = type.apply(type.apply(type.create(base), b), type.transform(a, b, 'right'))
    t.deepEqual(aThenB, type.create(result))
    t.deepEqual(bThenA, type.create(result))
  })
  t.end()
})

test('set.fuzzer', t => {
  fuzzer(type, (set) => {
    let add = new Set()
    let del = new Set()
    set = [...set]
    let newSet = new Set(set)
    for (let i = 0, count = randomInt(4); i < count; i++) {
      if (set.length > add.size && randomReal() < 0.5) {
        let el
        do {
          el = set[randomInt(set.length)]
        } while (add.has(el))
        del.add(el)
        newSet.delete(el)
      } else {
        let el
        do {
          el = randomWord()
        } while (del.has(el))
        add.add(el)
        newSet.add(el)
      }
    }
    return [{ add: [...add], del: [...del] }, newSet]
  })
  t.end()
})
