const test = require('tape')
const fuzzer = require('ot-fuzzer')
const type = require('../src/list')

test('list.create', t => {
  let list = type.create()
  t.ok(list)
  t.ok(Array.isArray(list))
  list = type.create([1,2,3])
  t.ok(list)
  t.deepEqual(list, [1,2,3])
  t.end()
})

test(`list.apply`, t => {
  [
    {
      // insert
      snapshot: [],
      delta: [['insert', 1]],
      result: [1]
    },
    {
      // multi insert
      snapshot: [],
      delta: [['insert', 1, 2, 3]],
      result: [1, 2, 3]
    },
    {
      // delete
      snapshot: [1],
      delta: [['delete', 1]],
      result: []
    },
    {
      // delete multiple
      snapshot: [1, 2, 3],
      delta: [['delete', 2]],
      result: [3]
    },
    {
      // delete + insert
      snapshot: [1],
      delta: [['delete', 1], ['insert', 2]],
      result: [2]
    },
    {
      // apply
      snapshot: [new Set([1])],
      delta: [['apply', 'set', { add: [2], del: [1] } ]],
      result: [new Set([2])]
    },
    {
      // retain + insert
      snapshot: [1,2,3],
      delta: [['retain', 2], ['insert', 2.5]],
      result: [1,2,2.5,3]
    },
    {
      // consecutive apply
      snapshot: [new Set([1]), new Set([2])],
      delta: [['apply', 'set', { add: [2], del: [] }], ['apply', 'set', { add: [1], del: [] } ]],
      result: [new Set([1,2]), new Set([2,1])]
    },
    {
      // retain + insert + retain + delete + apply
      snapshot: [1,3,4,new Set(['x'])],
      delta: [['retain', 1], ['insert', 2], ['retain', 1], ['delete', 1], ['apply', 'set', { add: ['y'], del: [] }]],
      result: [1,2,3,new Set(['x', 'y'])]
    }
  ].forEach(({ snapshot, delta, result }, index) => {
    t.deepEqual(type.apply(type.create(snapshot), delta), type.create(result))
  })
  t.end()
})

test('list.compose', t => {
  [
    {
      // retain + retain
      a: [['retain', 3]],
      b: [['retain', 4]],
      result: []
    },
    {
      // retain + insert
      a: [['retain', 3]],
      b: [['insert', 'x', 'y']],
      result: [['insert', 'x', 'y']]
    },
    {
      // retain/insert + retain/delete
      a: [['retain', 3], ['insert', 'x']],
      b: [['retain', 1], ['delete', 1]],
      result: [['retain', 1], ['delete', 1], ['retain', 1], ['insert', 'x']]
    },
    {
      // delete + retain/insert
      a: [['retain', 1], ['delete', 1]],
      b: [['insert', 'x', 'y']],
      result: [['delete', 1], ['insert', 'x', 'y']]
    },
    {
      // delete + apply
      a: [['delete', 1]],
      b: [['apply', 'list', ['insert', 'x']]],
      result: [['delete', 1]]
    },
  ].forEach(({ a, b, result }) => {
    t.deepEqual(type.compose(a, b), result)
  })
  t.end()
})

test('list.transform', t => {
  [
    {
      // retain + retain
      base: [1,2,3],
      a: [['retain', 3]],
      b: [['retain', 2]],
      result: [1,2,3]
    },
    {
      // retain + delete
      base: [1,2,3],
      a: [['retain', 3]],
      b: [['delete', 2]],
      result: [3]
    },
    {
      // delete + delete
      base: [1,2,3],
      a: [['delete', 1]],
      b: [['delete', 1]],
      result: [2,3]
    },
    {
      // insert + insert
      base: [1,2,3],
      a: [['insert', 0]],
      b: [['retain', 3], ['insert', 4]],
      result: [0,1,2,3,4]
    },
  ].forEach(({ base, a, b, result }) => {
    let bX = type.transform(b, a, 'left')
    let aX = type.transform(a, b, 'right')
    let aThenB = type.apply(type.apply(type.create(base), a), bX)
    let bThenA = type.apply(type.apply(type.create(base), b), aX)
    t.deepEqual(aThenB, type.create(result))
    t.deepEqual(bThenA, type.create(result))
  })
  t.end()
})

test('list.fuzzer', t => {
  fuzzer(type, (list) => {
    let delta = []
    let result = list.slice()
    let offset = 0
    if (list.length == 0) {
      let count = fuzzer.randomInt(3) + 1
      let inserts = []
      for (let i = 0; i < count; i++) {
        inserts.push(fuzzer.randomInt(10))
      }
      delta.push(['insert', ...inserts])
      offset += count
      result.splice(offset, 0, ...inserts)
    }
    for (let i = 0; i < 10; i++) {
      switch (fuzzer.randomInt(4)) {
        case 0:
          console.log('retain')
          count = Math.floor(fuzzer.randomInt(result.length - offset) / 2)
          if (count > 0) {
            delta.push(['retain', count])
            offset += count
          }
          break
        case 1:
          console.log('delete')
          count = Math.floor(fuzzer.randomInt(result.length - offset) / 2)
          if (count > 0) {
            delta.push(['delete', count])
            result.splice(offset, count)
          }
          break
        case 2:
          console.log('insert')
          count = fuzzer.randomInt(2) + 1
          let inserts = []
          for (let j = 0; j < count; j++) {
            inserts.push(fuzzer.randomInt(10))
          }
          delta.push(['insert', ...inserts])
          result.splice(offset, 0, ...inserts)
          offset += count
          break
        case 3:
          console.log('apply')
          if (offset < result.length - 1) {
            let value = fuzzer.randomInt(10)
            delta.push(['apply', 'register', value])
            result[offset] = value
            offset += 1
            break
          }
      }
    }
    delta = type.normalize(delta)
    console.log('fuzzer base', list)
    console.log('fuzzer delta', delta)
    console.log('fuzzer result', result, '\n')
    return [delta, result]
  })
  t.end()
})
