import test from 'tape'
import fuzzer from '@thomsbg/ot-fuzzer'
import { register as type } from '../src'

test('register.create', t => {
  let val = type.create('abc123')
  t.ok(val)
  t.equal(val, 'abc123')
  t.end()
})

test('register.apply', t => {
  [
    { snapshot: 'x', delta: 'y', result: 'y' },
    { snapshot: [1,2,3], delta: [4,5,6], result: [4,5,6] }
  ].forEach(({ snapshot, delta, result }) => {
    t.deepEqual(type.apply(type.create(snapshot), delta), type.create(result))
  })
  t.end()
})

test('register.compose', t => {
  [
    { a: 1, b: 2, result: 2 },
    { a: [1,2,3], b: [4,5,6], result: [4,5,6] },
    { a: {x:1,y:2}, b: {x:2,y:3}, result: {x:2,y:3} }
  ].forEach(({ a, b, result }) => {
    t.deepEqual(type.compose(a, b), result)
  })
  t.end()
})

test('register.transform', t => {
  [
    {
      base: 0, a: 1, b: 2, resultA: 1, resultB: 1, result: 1
    },
    {
      base: [], a: [1], b: [2], resultA: [1], resultB: [1], result: [1]
    }
  ].forEach(({ base, a, b, resultA, resultB, result }) => {
    let xA = type.transform(a, b, 'left')
    t.deepEqual(xA, resultA)
    let xB = type.transform(b, a, 'right')
    t.deepEqual(xB, resultB)
    t.deepEqual(type.apply(type.apply(base, a), xB), result)
    t.deepEqual(type.apply(type.apply(base, b), xA), result)
  })
  t.end()
})

test('register.fuzzer', t => {
  fuzzer(type, (oldValue) => {
    let newValue = fuzzer.randomInt(100)
    return [newValue, newValue]
  })
  t.end()
})
