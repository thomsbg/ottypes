const SUBTYPES = new Map()

const name = 'list'
const uri = 'https://github.com/thomsbg/ottypes/list'

function registerSubtype(type) {
  if (type.name) SUBTYPES.set(type.name, type)
  if (type.uri) SUBTYPES.set(type.uri, type)
}

function create(initial) {
  return initial ? [...initial] : []
}

function normalize(delta) {
  let result = []

  // rebuild by pushing every op, ensuring that consecutive ops of the same type
  // are merged, and that delete comes before insert, insert before apply
  for (let op of delta) {
    pushOp(result, op)
  }

  // strip trailing retain
  return chop(result)
}

function apply(list, delta) {
  let newList = []
  let offset = 0
  delta = normalize(delta)
  for (let i = 0; i < delta.length; i++) {
    let op = delta[i]
    let [type, ...args] = op
    switch (type) {
      case 'retain':
        let count = args[0]
        newList = newList.concat(list.slice(offset, offset + count));
        offset += count;
        break
      case 'insert':
        newList.push(...args);
        break
      case 'delete':
        offset += args[0];
        break
      case 'apply':
        let subtype = SUBTYPES.get(args[0]);
        if (!subtype) throw new Error('unknown subtype: ' + args[0]);
        newList.push(subtype.apply(list[offset], args[1]));
        offset += 1;
        break
      default:
        throw new Error('unknown op type', type)
    }
  }

  // implicit trailing retain
  return newList.concat(list.slice(offset));
};

// retain, delete, insert, apply
function compose(a, b) {
  let result = []
  // console.log('composing', a, b)
  let iterA = deltaIterator(a)
  let iterB = deltaIterator(b)
  while (iterA.hasNext() || iterB.hasNext()) {
    let lengthA = iterA.peekLength()
    let lengthB = iterB.peekLength()
    // console.log('composing loop', iterA.peekType(), lengthA, iterB.peekType(), lengthB)
    let lengthMin = Math.min(lengthA, lengthB)
    let opA, opB, subtype
    switch (iterA.peekType() + iterB.peekType()) {
      case 'retainretain':
      case 'applyretain':
      case 'deletedelete':
      case 'deleteretain':
      case 'deleteapply':
      case 'insertretain':
        // use A, skip over B
        pushOp(result, iterA.next(lengthMin))
        iterB.next(lengthMin)
        break
      case 'retaindelete':
      case 'retainapply':
      case 'applydelete':
        // use B, skip over A
        pushOp(result, iterB.next(lengthMin))
        iterA.next(lengthMin)
        break
      case 'deleteinsert':
        // use A, dont use B yet
        pushOp(result, iterA.next(lengthA))
        break
      case 'retaininsert':
      case 'applyinsert':
      case 'insertinsert':
        // use B, dont use A yet
        pushOp(result, iterB.next(lengthB))
        break
      case 'insertdelete':
        // skip over both
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break
      case 'insertapply':
        opA = iterA.next(1)
        opB = iterB.next(1)
        subtype = SUBTYPES.get(opB[1])
        let applied = subtype.apply(opA[1], opB[2])
        pushOp(result, ['insert', applied])
        break
      case 'applyapply':
        opA = iterA.next(lengthA)
        opB = iterB.next(lengthB)
        // compose with subtype
        if (opA[1] != opB[1]) {
          throw new Error('cannot compose apply operations of different subtypes', opA[1], opB[1])
        }
        subtype = SUBTYPES.get(opA[1])
        let composed = subtype.compose(opA[2], opB[2])
        pushOp(result, ['apply', opA[1], composed])
        break
    }
  }
  return chop(result)
}

function transform(a, b, side) {
  let newA = []
  let iterA = deltaIterator(a)
  let iterB = deltaIterator(b)
  while (iterA.hasNext() || iterB.hasNext()) {
    let lengthA = iterA.peekLength()
    let lengthB = iterB.peekLength()
    let lengthMin = Math.min(lengthA, lengthB)
    let count
    switch (iterA.peekType() + iterB.peekType()) {
      case 'retainretain':
        pushOp(newA, ['retain', lengthMin])
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break

      case 'deletedelete':
        pushOp(newA, ['delete', lengthA - lengthB])
        iterA.next(lengthA)
        iterB.next(lengthB)
        break

      case 'insertinsert':
        if (side === 'left') {
          pushOp(newA, iterA.next(lengthA))
        } else {
          pushOp(newA, ['retain', lengthB])
          pushOp(newA, iterA.next(lengthA))
        }
        iterB.next(lengthB)
        break

      case 'applyapply':
        let opA = iterA.next()
        let opB = iterB.next()
        if (opA[1] != opB[1]) {
          throw new Error('cannot transform apply ops for different subtypes:', opA[1], opB[1])
        }
        let subtype = SUBTYPES.get(opA[1])
        let transformed = subtype.transform(opA[2], opB[2], side)
        pushOp(newA, ['apply', opA[1], transformed])
        break

      case 'retaindelete':
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break
      case 'deleteretain':
        pushOp(newA, ['delete', lengthMin])
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break

      case 'retaininsert':
        pushOp(newA, ['retain', lengthB])
        iterB.next(lengthB)
        break
      case 'insertretain':
        pushOp(newA, iterA.next(lengthA))
        break

      case 'retainapply':
        iterB.next(lengthMin)
        break
      case 'applyretain':
        pushOp(newA, iterA.next(lengthMin))
        iterB.next(lengthMin)
        break

      case 'deleteinsert':
        pushOp(newA, ['retain', lengthB])
        pushOp(newA, ['delete', lengthA])
        iterA.next(lengthA)
        iterB.next(lengthB)
        break
      case 'insertdelete':
        iterB.next(lengthB)
        break

      case 'deleteapply':
        pushOp(newA, iterA.next(lengthMin)) // delete trumps apply
        iterB.next(lengthMin)
        break
      case 'applydelete':
        // no-op since delete trumps apply
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break

      case 'insertapply':
        pushOp(newA, iterA.next(lengthA))
        break
      case 'applyinsert':
        pushOp(newA, ['retain', lengthB])
        iterB.next(lengthB)
        break
    }
  }
  return chop(newA)
}

function has(obj, ...props) {
  return props.every(x => x in obj)
}

function pushOp(delta, op) {
  if ((op[0] == 'retain' || op[0] == 'delete') && op[1] <= 0) {
    // retain or delete < is a no-op
    return delta
  }
  if (delta.length == 0) {
    // if delta is empty, shortcut
    delta.push(op)
    return
  }
  let last = delta[delta.length - 1]
  switch (last[0] + op[0]) {
    case 'retainretain':
    case 'deletedelete':
      // merge consecutive retains/deletes
      last[1] += op[1]
      break
    case 'insertinsert':
      // merge consecutive inserts
      last.splice(last.length, 0, ...op.slice(1))
      break
    case 'insertdelete':
    // case 'applyinsert':
    // case 'applydelete':
      // ensure order of ops at same location follows: delete, insert, apply
      delta.splice(delta.length - 1, 0, op)
      break
    default:
      // otherwise push onto the end
      delta.push(op)
  }
}

function chop(delta) {
  if (delta.length > 0 && delta[delta.length - 1][0] == 'retain') {
    delta.pop()
  }
  return delta
}

function opLength(op) {
  let type = op[0]
  switch (type) {
    case 'retain':
    case 'delete':
      return op[1]
    case 'insert':
      return op.length - 1
    case 'apply':
      return 1
  }
}

function opSlice(op, offset, length) {
  switch (op[0]) {
    case 'retain':
    case 'delete':
      return [op[0], Math.min(length, op[1] - offset)]
    case 'insert':
      return ['insert', ...op.slice(1).slice(offset, offset + length)]
    case 'apply':
      // apply is indivisible
      return op
  }
}

function* opPairs(a, b) {
  let indexA = 0
  let offsetA = 0
  let indexB = 0
  let offsetB = 0
  while (indexA < a.length || indexB < b.length) {
    let opA = a[indexA] || ['retain', Infinity]
    let opB = b[indexB] || ['retain', Infinity]
    let lenA = opLength(opA)
    let lenB = opLength(opB)
    let size = Math.min(opLength(opA) - offsetA, opLength(opB) - offsetB)
    let sliceA = opSlice(opA, offsetA, size)
    let sliceB = opSlice(opB, offsetB, size)
    // if (sliceA == undefined) console.log('opA=',opA, 'a=', a)
    yield [sliceA, sliceB, size]
    offsetA += opLength(sliceA)
    if (offsetA >= lenA) {
      indexA += 1
      offsetA = 0
    }
    offsetB += opLength(sliceB)
    if (offsetB >= lenB) {
      indexB += 1
      offsetB = 0
    }
  }
}

function deltaIterator(delta) {
  var index = 0
  var offset = 0
  delta = normalize(delta)
  return {
    peekType() {
      if (index < delta.length) {
        return delta[index][0]
      } else {
        return 'retain'
      }
    },
    peekLength() {
      if (index < delta.length) {
        return opLength(delta[index]) - offset
      } else {
        return Infinity
      }
    },
    hasNext() {
      return index < delta.length
    },
    next(count) {
      if (count == null) {
        count = Infinity
      }
      if (index >= delta.length) {
        return ['retain', count]
      }
      let slice = opSlice(delta[index], offset, count)
      if (offset + count < opLength(delta[index])) {
        offset += count
      } else {
        index += 1
        offset = 0
      }
      return slice
    }
  }
}

module.exports = { name, uri, create, normalize, apply, compose, transform, registerSubtype }

registerSubtype(module.exports)
registerSubtype(require('./register'))
registerSubtype(require('./set'))
// registerSubtype(require('./map'))
// registerSubtype(require('./tree'))
