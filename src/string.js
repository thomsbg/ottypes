// TODO: use rope data structure?

export const name = 'string'
export const uri = 'https://github.com/thomsbg/ottypes/string'

export function create(string = '') {
  return string.toString()
}

export function apply(string, delta) {
  let newString = string.slice()
  let offset = 0
  for (let value of delta) {
    const op = new Op(value)
    switch (op.type) {
    case 'retain':
      offset += value
      break
    case 'delete':
      newString = stringSplice(newString, offset, -1 * value)
      break
    case 'insert':
      newString = stringSplice(newString, offset, 0, value)
      offset += op.length
      break
    }
  }
  return newString
}

export function normalize(delta) {
  if (delta.length === 0) return []

  const result = [delta[0]]
  for (let i = 1; i < delta.length; i++) {
    const j = result.length - 1
    const prev = new Op(result[j])
    const next = new Op(delta[i])
    if (prev.type === next.type) {
      // join consecutive ops of the same type
      result[j] = prev.value + next.value
    } else if (prev.type === 'insert' && next.type === 'delete') {
      const prevPrev = j > 0 && new Op(result[j - 1])
      if (prevPrev && prevPrev.type === 'delete') {
        // delete, insert, delete => merged delete, insert
        result[j - 1] = prevPrev.value + next.value
      } else {
        // insert, delete => delete, insert
        result.splice(j, 0, next.value)
      }
    } else {
      result.push(next.value)
    }
  }
  // If last op is a retain, remove it
  if (new Op(result[result.length - 1]).type === 'retain') {
    result.pop()
  }
  return result
}

export function compose(a, b) {
  const result = []
  const iterA = new Iterator(a)
  const iterB = new Iterator(b)

  while (iterA.hasNext() || iterB.hasNext()) {
    const a = iterA.peek()
    const b = iterB.peek()
    const lengthMin = Math.min(a.length, b.length)

    switch (a.type + b.type) {
    case 'deleteretain':
    case 'deletedelete':
    case 'deleteinsert':
      // A's deletes happen before anything from B
      result.push(iterA.next(lengthMin).value)
      break
    case 'retaininsert':
    case 'insertinsert':
      // besides deletes, B's inserts happen before things in A
      result.push(iterB.next(lengthMin).value)
      break
    case 'retainretain':
    case 'retaindelete':
      // A's retains are made redundant by B's retains + deletes
      result.push(iterB.next(lengthMin).value)
      iterA.next(lengthMin)
      break
    case 'insertretain':
      // B's retains are made redundant by A's inserts
      result.push(iterA.next(lengthMin).value)
      iterB.next(lengthMin)
      break
    case 'insertdelete':
      // B's delete negates A's insert, skip over both
      iterA.next(lengthMin)
      iterB.next(lengthMin)
      break
    }
  }
  return normalize(result)
}

export function transform(a, b, side) {
  const result = []
  const iterA = new Iterator(a)
  const iterB = new Iterator(b)

  while (iterA.hasNext() || iterB.hasNext()) {
    const a = iterA.peek()
    const b = iterB.peek()
    const lengthMin = Math.min(a.length, b.length)

    switch (a.type + b.type) {
    case 'deletedelete':
    case 'retaindelete':
      // B's delete made A's op unnecessary
      iterB.next(lengthMin)
      iterA.next(lengthMin)
      break
    case 'deleteretain':
    case 'retainretain':
      // A's op consumes B's retain
      result.push(iterA.next(lengthMin).value)
      iterB.next(lengthMin)
      break
    case 'deleteinsert':
    case 'retaininsert':
      // A must shift for B's insert
      result.push(new Op(b.length).value)
      iterB.next(b.length)
      break
    case 'insertdelete':
    case 'insertretain':
      // A's insert doesn't affect B's op
      result.push(iterA.next(lengthMin).value)
      break
    case 'insertinsert':
      // use the tiebreaker: if not 'left', then shift over for B's insert
      if (side == 'left') {
        result.push(iterA.next(a.length).value)
      } else {
        result.push(b.length)
        result.push(iterA.next(a.length).value)
        iterB.next(b.length)
      }
      break
    }
  }
  return normalize(result)
}

class Op {
  constructor(value) {
    if ([0, ''].includes(value) || !['number', 'string'].includes(typeof value)) {
      throw new TypeError(`Unsupported op value (${value})`)
    }
    this.value = value
  }

  get type() {
    if (typeof this.value === 'number') {
      return this.value > 0 ? 'retain' : 'delete'
    } else {
      return 'insert'
    }
  }

  get length() {
    switch (this.type) {
    case 'retain':
      return this.value
    case 'delete':
      return -1 * this.value
    case 'insert':
      return this.value.length
    }
  }

  slice(offset, length = Infinity) {
    length = Math.min(length, this.length - offset)
    switch (this.type) {
    case 'retain':
      return new Op(Math.min(length, this.value - offset))
    case 'delete':
      return new Op(Math.max(-1 * length, this.value + offset))
    case 'insert':
      return new Op(this.value.slice(offset, offset + length))
    }
  }
}

class Iterator {
  constructor(delta) {
    this.delta = delta
    this.index = 0
    this.offset = 0
  }

  hasNext() {
    return this.index < this.delta.length
  }

  peek() {
    if (!this.hasNext()) {
      return new Op(Infinity)
    }

    return new Op(this.delta[this.index]).slice(this.offset)
  }

  next(count = Infinity) {
    if (!this.hasNext()) {
      return new Op(count)
    }
    const op = new Op(this.delta[this.index])
    const slice = op.slice(this.offset, count)
    if (this.offset + count < op.length) {
      this.offset += count
    } else {
      this.index += 1
      this.offset = 0
    }
    return slice
  }
}

function stringSplice(string, index, count, insert = '') {
  return string.slice(0, index) + insert + string.slice(index + count)
}
