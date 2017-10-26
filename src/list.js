import { get as getSubtype } from './subtypes'

export const name = 'list'
export const uri = 'https://github.com/thomsbg/ottypes/list'

export function create(initial) {
  return initial ? [...initial] : []
}

export function normalize(delta) {
  let result = []

  // rebuild by pushing every op, ensuring that consecutive ops of the same type
  // are merged, and that delete comes before insert, insert before apply
  for (let op of delta) {
    pushOp(result, op)
  }

  // strip trailing retain
  return chop(result)
}

export function apply(list, delta) {
  let newList = []
  let offset = 0

  for (let [type, ...args] of delta) {
    switch (type) {
      case 'retain':
        let count = args[0]
        newList = newList.concat(list.slice(offset, offset + count))
        offset += count
        break

      case 'insert':
        newList.push(...args)
        break

      case 'delete':
        offset += args[0]
        break

      case 'apply':
        let subtype = getSubtype(args[0])
        newList.push(subtype.apply(list[offset], args[1]))
        offset += 1
        break

      default:
        throw new Error(`unknown op type: ${type}`)
    }
  }

  // implicit trailing retain
  return newList.concat(list.slice(offset))
}

export function compose(a, b) {
  let result = []
  let iterA = deltaIterator(a)
  let iterB = deltaIterator(b)

  while (iterA.hasNext() || iterB.hasNext()) {
    let lengthA = iterA.peekLength()
    let lengthB = iterB.peekLength()
    let lengthMin = Math.min(lengthA, lengthB)

    switch (iterA.peekType() + iterB.peekType()) {
      case 'deleteretain':
      case 'deleteinsert':
      case 'deletedelete':
      case 'deleteapply':
        // A's deletes happens first, don't consume anything from B
        pushOp(result, iterA.next(lengthA))
        break

      case 'insertinsert':
      case 'retaininsert':
      case 'applyinsert':
        // B's inserts happen second, don't consume anything from A
        pushOp(result, iterB.next(lengthB))
        break

      case 'insertdelete':
        // B deleting what A inserted is a no-op
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break

      case 'retainretain':
      case 'insertretain':
      case 'applyretain':
        // A's operation gets applied while B's retain gets consumed
        pushOp(result, iterA.next(lengthMin))
        iterB.next(lengthMin)
        break

      case 'retainapply':
      case 'retaindelete':
        // B's operation gets applied while A's retain gets consumed
        pushOp(result, iterB.next(lengthMin))
        iterA.next(lengthMin)
        break

      case 'applydelete':
        // B's delete clobbers A's apply
        pushOp(result, iterB.next(lengthMin))
        iterA.next(lengthMin)
        break

      case 'insertapply':
        // B's apply modifies the first value inserted by A
        var [, firstA, ...restA] = iterA.next(lengthMin)
        var [, typeB, argB] = iterB.next(lengthMin)
        var applied = getSubtype(typeB).apply(firstA, argB)
        pushOp(result, ['insert', applied, ...restA])
        break

      case 'applyapply':
        // A's and B's ops get composed if they match
        var [, typeA, argA] = iterA.next(lengthA)
        var [, typeB, argB] = iterB.next(lengthB)
        if (typeA != typeB) {
          throw new Error(`cannot compose apply ops with different subtypes: ${typeA}, ${typeB}`)
        }
        var composed = getSubtype(typeA).compose(argA, argB)
        pushOp(result, ['apply', typeA, composed])
        break

      default:
        throw new Error(`unknown op types: ${iterA.peekType()}${iterB.peekType()}`)
    }
  }

  return chop(result)
}

export function transform(ourOps, theirOps, side) {
  let result = []
  let ours = deltaIterator(ourOps)
  let theirs = deltaIterator(theirOps)

  while (ours.hasNext() || theirs.hasNext()) {
    let lengthOurs = ours.peekLength()
    let lengthTheirs = theirs.peekLength()
    let lengthMin = Math.min(lengthOurs, lengthTheirs)
    let count

    switch (ours.peekType() + theirs.peekType()) {
      case 'retainretain':
      case 'deleteretain':
      case 'applyretain':
      case 'retainapply':
      case 'deleteapply':
        // our op consumes some of their retain
        // their apply may act as a 'retain 1'
        pushOp(result, ours.next(lengthMin))
        theirs.next(lengthMin)
        break

      case 'deletedelete':
      case 'applydelete':
      case 'retaindelete':
        // their delete made some (or all) of our op unnecessary
        ours.next(lengthMin)
        theirs.next(lengthMin)
        break

      case 'retaininsert':
      case 'applyinsert':
      case 'deleteinsert':
        // shift for their insert
        pushOp(result, ['retain', lengthTheirs])
        theirs.next(lengthTheirs)
        break

      case 'insertretain':
      case 'insertapply':
      case 'insertdelete':
        // our insert happens before their op
        pushOp(result, ours.next(lengthMin))
        break

      case 'insertinsert':
        // use the tiebreaker to see who goes first
        if (side == 'left') {
          pushOp(result, ours.next(lengthOurs))
        } else {
          pushOp(result, ['retain', lengthTheirs])
          pushOp(result, ours.next(lengthOurs))
          theirs.next(lengthTheirs)
        }
        break

      case 'applyapply':
        // recurse to call the transform function if the subtypes match
        let [, ourSubtype, ourArg] = ours.next()
        let [, theirSubtype, theirArg] = theirs.next()
        if (ourSubtype !== theirSubtype) {
          throw new Error(`cannot transform apply ops with different subtypes: ${ourSubtype}, ${theirSubtype}`)
        }
        let transformed = getSubtype(ourSubtype).transform(ourArg, theirArg, side)
        pushOp(result, ['apply', ourSubtype, transformed])
        break

      default:
        throw new Error(`unknown op types: ${ours.peekType()}${theirs.peekType()}`)
    }
  }

  return chop(result)
}

function pushOp(delta, op) {
  if ((op[0] == 'retain' || op[0] == 'delete') && op[1] <= 0) {
    // retain or delete < is a no-op
    return delta
  }
  if (op[0] == 'insert' && op.length < 2) {
    // insert with no args is a no-op
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
      // ensure delete comes before insert
      // if 2nd to last is a delete, make sure to merge it as above
      var nextToLast = (delta.length > 1) && delta[delta.length - 2]
      if (nextToLast && nextToLast[0] == 'delete') {
        nextToLast[1] += op[1]
      } else {
        delta.splice(delta.length - 1, 0, op)
      }
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
