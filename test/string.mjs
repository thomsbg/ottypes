import test from 'tape'
import fuzzer, { randomInt, randomWord } from '@thomsbg/ot-fuzzer'
import { string as type } from '@thomsbg/ottypes'

test('string.create', t => {
  let string = type.create()
  t.equal(string, '')
  string = type.create('abc')
  t.deepEqual(string, 'abc')
  t.end()
})

test(`string.apply`, t => {
  [
    {
      // insert
      snapshot: [],
      delta: ['x'],
      result: 'x'
    },
    {
      // multi insert
      snapshot: [],
      delta: ['xyz'],
      result: 'xyz'
    },
    {
      // delete
      snapshot: 'abc',
      delta: [-1],
      result: 'bc'
    },
    {
      // delete multiple
      snapshot: 'abc',
      delta: [-2],
      result: 'c'
    },
    {
      // delete + insert
      snapshot: 'abc',
      delta: [-2, 'd'],
      result: 'dc'
    },
    {
      // retain + insert
      snapshot: 'abc',
      delta: [2, 'x'],
      result: 'abxc'
    },
    {
      // retain + insert + retain + delete
      snapshot: 'abcd',
      delta: [1, 'x', 1, -1],
      result: 'axbd'
    }
  ].forEach(({ snapshot, delta, result }, index) => {
    t.deepEqual(type.apply(type.create(snapshot), delta), type.create(result))
  })
  t.end()
})

test('string.compose', t => {
  [
    {
      desc: 'retain + retain',
      a: [3],
      b: [4],
      result: []
    },
    {
      desc: 'insert + insert',
      a: ['x'],
      b: ['y'],
      result: ['yx']
    },
    {
      desc: 'delete + delete',
      a: [-1],
      b: [-2],
      result: [-3]
    },
    {
      desc: 'retain + insert',
      a: [3, 'z'],
      b: ['xy'],
      result: ['xy', 3, 'z']
    },
    {
      desc: 'insert + retain',
      a: ['xy'],
      b: [3, 'z'],
      result: ['xy', 1, 'z']
    },
    {
      desc: 'retain + delete',
      a: [2, 'x'],
      b: [-1],
      result: [-1, 1, 'x']
    },
    {
      desc: 'delete + retain',
      a: [-1],
      b: [2, 'x'],
      result: [-1, 2, 'x']
    },
    {
      desc: 'insert + delete',
      a: ['x'],
      b: [-2],
      result: [-1]
    },
    {
      desc: 'delete + insert',
      a: [-2],
      b: ['x'],
      result: [-2, 'x']
    }
  ].forEach(({ desc, a, b, result }) => {
    t.deepEqual(type.compose(a, b), result, `compose: ${desc}`)
  })
  t.end()
})

test('string.transform', t => {
  [
    {
      desc: 'retain + retain',
      base: '123',
      a: [3, 'x'],
      b: [1, 'y'],
      resultA: [4, 'x'],
      resultB: [1, 'y'],
      resultApplied: '1y23x'
    },
    {
      desc: 'delete + delete',
      base: '123',
      a: [-1],
      b: [-2],
      resultA: [],
      resultB: [-1],
      resultApplied: '3'
    },
    {
      desc: 'insert + insert',
      base: '123',
      a: ['xy'],
      b: ['z'],
      resultA: ['xy'],
      resultB: [2, 'z'],
      resultApplied: 'xyz123'
    },
    {
      desc: 'retain + delete',
      base: '123',
      a: [3, 'x'],
      b: [-2],
      resultA: [1, 'x'],
      resultB: [-2],
      resultApplied: '3x'
    },
    {
      desc: 'retain + insert',
      base: '123',
      a: [3, 'x'],
      b: ['0'],
      resultA: [4, 'x'],
      resultB: ['0'],
      resultApplied: '0123x'
    },
    {
      desc: 'delete + insert',
      base: '123',
      a: [-2],
      b: ['x'],
      resultA: [1, -2],
      resultB: ['x'],
      resultApplied: 'x3'
    },
    {
      desc: 'fuzzer #1',
      base: '123',
      a: [-1, 'x'],
      b: ['y', 1, 'z'],
      resultA: [1, -1, 'x'],
      resultB: ['y', 1, 'z'],
      resultApplied: 'yxz23'
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

test('string.fuzzer', t => {
  fuzzer(type, (string) => {
    let delta = []
    let result = string.slice()
    let offset = 0
    if (string.length == 0) {
      string = randomWord()
    }
    for (let i = 0; i < 3; i++) {
      let count
      switch (randomInt(3)) {
        case 0:
          count = Math.floor(randomInt(result.length - offset) / 2)
          if (count > 0) {
            delta.push(count)
            offset += count
          }
          break
        case 1:
          count = Math.floor(randomInt(result.length - offset) / 2)
          if (count > 0) {
            delta.push(-1 * count)
            result = result.slice(0, offset) + result.slice(offset + count)
          }
          break
        case 2:
          let insert = randomWord()
          while (insert === '') {
            insert = randomWord()
          }
          delta.push(insert)
          result = result.slice(0, offset) + insert + result.slice(offset)
          offset += insert.length
          break
      }
    }
    delta = type.normalize(delta)
    return [delta, result]
  })
  t.end()
})
