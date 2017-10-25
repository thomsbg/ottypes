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
      desc: 'retain + retain',
      a: [['retain', 3]],
      b: [['retain', 4]],
      result: []
    },
    {
      desc: 'insert + insert',
      a: [['insert', 'x']],
      b: [['insert', 'y']],
      result: [['insert', 'y', 'x']]
    },
    {
      desc: 'delete + delete',
      a: [['delete', 1]],
      b: [['delete', 1]],
      result: [['delete', 2]]
    },
    {
      desc: 'apply + apply',
      a: [['apply', 'register', 1]],
      b: [['apply', 'register', 2]],
      result: [['apply', 'register', 2]]
    },
    {
      desc: 'delete + apply',
      a: [['delete', 1]],
      b: [['apply', 'register', 1]],
      result: [['delete', 1], ['apply', 'register', 1]]
    },
    {
      desc: 'apply + delete',
      a: [['apply', 'register', 1]],
      b: [['delete', 1]],
      result: [['delete', 1]]
    },
    {
      desc: 'apply + insert',
      a: [['apply', 'register', 1]],
      b: [['insert', 1]],
      result: [['insert', 1], ['apply', 'register', 1]]
    },
    {
      desc: 'insert + apply',
      a: [['insert', 1]],
      b: [['apply', 'register', 1]],
      result: [['insert', 1]]
    },
    {
      desc: 'retain + apply',
      a: [['retain', 2], ['insert', 'x']],
      b: [['apply', 'register', 1]],
      result: [['apply', 'register', 1], ['retain', 1], ['insert', 'x']]
    },
    {
      desc: 'apply + retain',
      a: [['apply', 'register', 1]],
      b: [['retain', 2], ['insert', 'x']],
      result: [['apply', 'register', 1], ['retain', 1], ['insert', 'x']]
    },
    {
      desc: 'retain + insert',
      a: [['retain', 3], ['insert', 'z']],
      b: [['insert', 'x', 'y']],
      result: [['insert', 'x', 'y'], ['retain', 3], ['insert', 'z']]
    },
    {
      desc: 'insert + retain',
      a: [['insert', 'x', 'y']],
      b: [['retain', 3], ['insert', 'z']],
      result: [['insert', 'x', 'y'], ['retain', 1], ['insert', 'z']]
    },
    {
      desc: 'retain + delete',
      a: [['retain', 2], ['insert', 'x']],
      b: [['delete', 1]],
      result: [['delete', 1], ['retain', 1], ['insert', 'x']]
    },
    {
      desc: 'delete + retain',
      a: [['delete', 1]],
      b: [['retain', 2], ['insert', 'x']],
      result: [['delete', 1], ['retain', 2], ['insert', 'x']]
    },
    {
      desc: 'insert + delete',
      a: [['insert', 'x']],
      b: [['delete', 2]],
      result: [['delete', 1]]
    },
    {
      desc: 'delete + insert',
      a: [['delete', 2]],
      b: [['insert', 'x']],
      result: [['delete', 2], ['insert', 'x']]
    },
    {
      desc: 'retain/insert + retain/delete/apply',
      a: [['retain', 3], ['insert', 'x']],
      b: [['retain', 1], ['delete', 1], ['retain', 1], ['apply', 'register', 'z']],
      result: [['retain', 1], ['delete', 1], ['retain', 1], ['insert', 'z']]
    }
  ].forEach(({ desc, a, b, result }) => {
    t.deepEqual(type.compose(a, b), result, `compose: ${desc}`)
  })
  t.end()
})

test('list.transform', t => {
  [
    {
      desc: 'retain + retain',
      base: [1,2,3],
      a: [['retain', 3], ['insert', 'x']],
      b: [['retain', 1], ['insert', 'y']],
      resultA: [['retain', 4], ['insert', 'x']],
      resultB: [['retain', 1], ['insert', 'y']],
      resultApplied: [1,'y',2,3,'x']
    },
    {
      desc: 'delete + delete',
      base: [1,2,3],
      a: [['delete', 1]],
      b: [['delete', 2]],
      resultA: [],
      resultB: [['delete', 1]],
      resultApplied: [3]
    },
    {
      desc: 'insert + insert',
      base: [1,2,3],
      a: [['insert', 'x', 'y']],
      b: [['insert', 'z']],
      resultA: [['insert', 'x', 'y']],
      resultB: [['retain', 2], ['insert', 'z']],
      resultApplied: ['x','y','z',1,2,3]
    },
    {
      desc: 'apply + apply',
      base: [1,2,3],
      a: [['apply', 'register', 'x']],
      b: [['apply', 'register', 'y']],
      resultA: [['apply', 'register', 'x']],
      resultB: [['apply', 'register', 'x']],
      resultApplied: ['x',2,3]
    },
    {
      desc: 'retain + delete',
      base: [1,2,3],
      a: [['retain', 3], ['insert', 'x']],
      b: [['delete', 2]],
      resultA: [['retain', 1], ['insert', 'x']],
      resultB: [['delete', 2]],
      resultApplied: [3, 'x']
    },
    {
      desc: 'retain + insert',
      base: [1,2,3],
      a: [['retain', 3], ['insert', 'x']],
      b: [['insert', 0]],
      resultA: [['retain', 4], ['insert', 'x']],
      resultB: [['insert', 0]],
      resultApplied: [0,1,2,3,'x']
    },
    {
      desc: 'retain + apply',
      base: [1,2,3],
      a: [['retain', 3], ['insert', 'x']],
      b: [['apply', 'register', 'y']],
      resultA: [['retain', 3], ['insert', 'x']],
      resultB: [['apply', 'register', 'y']],
      resultApplied: ['y',2,3,'x']
    },
    {
      desc: 'delete + insert',
      base: [1,2,3],
      a: [['delete', 2]],
      b: [['insert', 'x']],
      resultA: [['retain', 1], ['delete', 2]],
      resultB: [['insert', 'x']],
      resultApplied: ['x',3]
    },
    {
      desc: 'delete + apply',
      base: [1,2,3],
      a: [['delete', 2]],
      b: [['apply', 'register', 'x']],
      resultA: [['delete', 2]],
      resultB: [],
      resultApplied: [3]
    },
    {
      desc: 'insert + apply',
      base: [1,2,3],
      a: [['insert', 'x']],
      b: [['apply', 'register', 'y']],
      resultA: [['insert', 'x']],
      resultB: [['retain', 1], ['apply', 'register', 'y']],
      resultApplied: ['x','y',2,3]
    },
    {
      desc: 'fuzzer #1',
      base: [1,2,3],
      a: [['delete', 1], ['insert', 'x']],
      b: [['insert', 'y'], ['retain', 1], ['insert', 'z']],
      resultA: [['retain', 1], ['delete',1], ['insert','x']],
      resultB: [['insert', 'y'], ['retain', 1], ['insert', 'z']],
      resultApplied: ['y','x','z',2,3]
    }
  ].forEach(({ desc, base, a, b, resultA, resultB, resultApplied }) => {
    let aX = type.transform(a, b, 'left')
    t.deepEqual(aX, resultA, `transform: ${desc}: A`)
    let bX = type.transform(b, a, 'right')
    t.deepEqual(bX, resultB, `transform: ${desc}: B`)
    let aThenB = type.apply(type.apply(type.create(base), a), bX)
    t.deepEqual(aThenB, type.create(resultApplied), `transform: ${desc}: apply A then B`)
    let bThenA = type.apply(type.apply(type.create(base), b), aX)
    t.deepEqual(bThenA, type.create(resultApplied), `transform: ${desc}: apply B then A`)
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
      return [delta, result]
    }
    for (let i = 0; i < 3; i++) {
      let count
      switch (fuzzer.randomInt(4)) {
        case 0:
          count = Math.floor(fuzzer.randomInt(result.length - offset) / 2)
          if (count > 0) {
            delta.push(['retain', count])
            offset += count
          }
          break
        case 1:
          count = Math.floor(fuzzer.randomInt(result.length - offset) / 2)
          if (count > 0) {
            delta.push(['delete', count])
            result.splice(offset, count)
          }
          break
        case 2:
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
    // console.log('fuzzer base', list)
    // console.log('fuzzer delta', delta)
    // console.log('fuzzer result', result, '\n')
    return [delta, result]
  })
  t.end()
})
