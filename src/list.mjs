import { get as getSubtype } from './subtypes.mjs'

export const name = 'list'
export const uri = 'https://github.com/thomsbg/ottypes/list'

export function create(initial) {
  return initial ? [...initial] : []
}

export function normalize(delta) {
  const result = []

  // rebuild by pushing every op
  for (const op of delta) {
    pushOp(result, op)
  }

  // strip trailing keep
  return chop(result)
}

export function apply(list, delta) {
  const result = []
  const buffer = Object.create(null)
  let offset = 0

  for (const [type, arg] of delta) {
    switch (type) {
      case 'keep':
      case 'remove':
        offset += arg
        break

      case 'apply':
        offset += 1
        break

      case 'cut':
        if (arg in buffer) throw new Error('cannot cut with the same argument more than once')
        buffer[arg] = list[offset]
        offset += 1
        break
    }
  }

  for (const [type, arg] of delta) {
    switch (type) {
      case 'keep':
        if (offset + arg > list.length) throw new RangeError('cannot keep beyond the end of the list')
        result.push(...list.slice(offset, offset + arg))
        offset += arg
        break

      case 'insert':
        result.push(arg)
        break

      case 'remove':
        if (offset + arg > list.length) throw new RangeError('cannot remove beyond the end of the list')
        offset += arg
        break

      case 'apply':
        if (offset >= list.length) throw new RangeError('cannot apply beyond the end of the list')
        const [name, operand] = arg
        const subtype = getSubtype(name)
        result.push(subtype.apply(list[offset], operand))
        offset += 1
        break

      case 'cut':
        if (offset >= list.length) throw new RangeError('cannot cut beyond the end of the list')
        offset += 1
        break

      case 'paste':
        if (!(arg in buffer)) throw new Error('cannot paste without a corresponding cut')
        result.push(buffer[arg]);
        break

      default:
        throw new Error(`unknown op: ${type}`)
    }
  }

  // implicit trailing keep
  if (offset < list.length) result.push(...list.slice(offset))

  return result
}

export function compose(a, b) {
  const result = []
  const iterA = deltaIterator(a)
  const iterB = deltaIterator(b)

  while (iterA.hasNext() || iterB.hasNext()) {
    const lengthA = iterA.peekLength()
    const lengthB = iterB.peekLength()
    const lengthMin = Math.min(lengthA, lengthB)

    switch (iterA.peekType() + iterB.peekType()) {
      case 'removekeep':
      case 'removeinsert':
      case 'removeremove':
      case 'removeapply':
      case 'removecut':
      case 'removepaste':
        // A overrides B
        pushOp(result, iterA.next(lengthA))
        break

      case 'insertinsert':
      case 'keepinsert':
      case 'applyinsert':
        // B's inserts happen second, don't consume anything from A
        pushOp(result, iterB.next(lengthB))
        break

      case 'insertremove':
        // B deleting what A inserted is a no-op
        iterA.next(lengthMin)
        iterB.next(lengthMin)
        break

      case 'keepkeep':
      case 'insertkeep':
      case 'applykeep':
        // A's operation gets applied while B's keep gets consumed
        pushOp(result, iterA.next(lengthMin))
        iterB.next(lengthMin)
        break

      case 'keepapply':
      case 'keepremove':
        // B's operation gets applied while A's keep gets consumed
        pushOp(result, iterB.next(lengthMin))
        iterA.next(lengthMin)
        break

      case 'applyremove':
        // B's remove clobbers A's apply
        pushOp(result, iterB.next(lengthMin))
        iterA.next(lengthMin)
        break

      case 'insertapply':
        // B's apply modifies the value inserted by A
        const [, argA] = iterA.next(lengthMin)
        const [, subtypeB, argB] = iterB.next(lengthMin)
        const applied = getSubtype(subtypeB).apply(argA, argB)
        pushOp(result, ['insert', applied])
        break

      case 'applyapply':
        // A's and B's ops get composed if they match
        const [, subtypeA, argA] = iterA.next(lengthA)
        const [, subtypeB, argB] = iterB.next(lengthB)
        if (subtypeA !== subtypeB) {
          // IDEA: what if there was an ottype that could apply both subtype patches in order?
          throw new Error(`cannot compose apply ops with different subtypes: ${subtypeA}, ${subtypeB}`)
        }
        const composed = getSubtype(subtypeA).compose(argA, argB)
        pushOp(result, ['apply', subtypeA, composed])
        break

      default:
        throw new Error(`unknown op types: ${iterA.peekType()}${iterB.peekType()}`)
    }
  }

  return chop(result)
}

export function transform(ourOps, theirOps, side) {
  const result = []
  const ours = deltaIterator(ourOps)
  const theirs = deltaIterator(theirOps)

  while (ours.hasNext() || theirs.hasNext()) {
    const lengthOurs = ours.peekLength()
    const lengthTheirs = theirs.peekLength()
    const lengthMin = Math.min(lengthOurs, lengthTheirs)

    switch (ours.peekType() + theirs.peekType()) {
      case 'keepkeep':
      case 'removekeep':
      case 'applykeep':
      case 'keepapply':
      case 'removeapply':
        // our op consumes some of their keep
        // their apply may act as a 'keep 1'
        pushOp(result, ours.next(lengthMin))
        theirs.next(lengthMin)
        break

      case 'removeremove':
      case 'applyremove':
      case 'keepremove':
        // their remove made some (or all) of our op unnecessary
        ours.next(lengthMin)
        theirs.next(lengthMin)
        break

      case 'keepinsert':
      case 'applyinsert':
      case 'removeinsert':
        // shift for their insert
        pushOp(result, ['keep', lengthTheirs])
        theirs.next(lengthTheirs)
        break

      case 'insertkeep':
      case 'insertapply':
      case 'insertremove':
        // our insert happens before their op
        pushOp(result, ours.next(lengthMin))
        break

      case 'insertinsert':
        // use the tiebreaker to see who goes first
        if (side == 'left') {
          pushOp(result, ours.next(lengthOurs))
        } else {
          pushOp(result, ['keep', lengthTheirs])
          pushOp(result, ours.next(lengthOurs))
          theirs.next(lengthTheirs)
        }
        break

      case 'applyapply':
        // recurse to call the transform function if the subtypes match
        const [, ourSubtype, ourArg] = ours.next()
        const [, theirSubtype, theirArg] = theirs.next()
        if (ourSubtype !== theirSubtype) {
          throw new Error(`cannot transform apply ops with different subtypes: ${ourSubtype}, ${theirSubtype}`)
        }
        const transformed = getSubtype(ourSubtype).transform(ourArg, theirArg, side)
        pushOp(result, ['apply', ourSubtype, transformed])
        break

      default:
        throw new Error(`unknown op types: ${ours.peekType()}${theirs.peekType()}`)
    }
  }

  return chop(result)
}

function pushOp(delta, op) {
  const [type] = op
  if (delta.length == 0) {
    delta.push(op)
    return
  }
  const lastOp = delta[delta.length - 1]
  const lastType = lastOp[0]
  switch (lastType + type) {
    case 'keepkeep':
    case 'removeremove':
      // merge consecutive keeps/removes
      lastOp[1] += op[1]
      break
    case 'insertremove':
      // ensure remove comes before insert
      // if 2nd to last is a remove, make sure to merge it as above
      const nextToLastOp = (delta.length > 1) && delta[delta.length - 2]
      if (nextToLastOp && nextToLastOp[0] == 'remove') {
        nextToLastOp[1] += op[1]
      } else {
        delta.splice(delta.length - 1, 0, op)
      }
      break
    case 'cutpaste':
      // consecutive cut and paste of same key is a no-op
      if (lastOp[1] === op[1]) pushOp(delta, ['keep', 1])
      else delta.push(op)
      break
    default:
      // otherwise push onto the end
      delta.push(op)
  }
}

function chop(delta) {
  if (delta.length > 0 && delta[delta.length - 1][0] == 'keep') {
    delta.pop()
  }
  return delta
}

function opLength(op) {
  const type = op[0]
  switch (type) {
    case 'keep':
    case 'remove':
      return op[1]
    case 'insert':
    case 'apply':
    case 'cut':
    case 'paste':
      return 1
  }
}

function opSlice(op, offset, length) {
  switch (op[0]) {
    case 'keep':
    case 'remove':
      return [op[0], Math.min(length, op[1] - offset)]
    case 'insert':
    case 'apply':
    case 'cut':
    case 'paste':
      return op
  }
}

function deltaIterator(delta) {
  let index = 0
  let offset = 0
  return {
    peekType() {
      if (index < delta.length) {
        return delta[index][0]
      } else {
        return 'keep'
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
    next(count = Infinity) {
      if (index >= delta.length) {
        return ['keep', count]
      }
      const slice = opSlice(delta[index], offset, count)
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
