import test from 'tape'
import fuzzer from '@thomsbg/ot-fuzzer'
import { map as type } from '../src'

test('map.fuzzer', t => {
  // override serialize for deep equality check
  // cannot be used in general
  let testType = Object.assign({}, type, {
    serialize: function(map) {
      return [...map].sort((a, b) => b[0] - a[0])
    }
  })
  fuzzer(testType, map => {
    let newMap = new Map(map)
    let add = new Map()
    let del = new Set()
    for (let i = 0, count = fuzzer.randomInt(10); i < count; i++) {
      if (fuzzer.randomReal() < 0.5) {
        let k = fuzzer.randomInt(100)
        while (add.has(k)) {
          k = fuzzer.randomInt(100)
        }
        del.add(k)
        newMap.delete(k)
      } else {
        let k = fuzzer.randomInt(100)
        while (del.has(k)) {
          k = fuzzer.randomInt(100)
        }
        let v = fuzzer.randomWord()
        add.set(k, v)
        newMap.set(k, v)
      }
    }
    return [{ add: [...add], del: [...del] }, newMap]
  })
  t.end()
})
