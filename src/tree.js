// sparse traversal
// insert, delete, modify
// set
// wrap, unwrap
// non-invertible?

// class Leaf {
//   constructor(data, parent) {
//     this.data = data
//     this.parent = parent
//   }

//   *[Symbol.iterator]() {
//     yield this.data
//   }
// }

// class Tree {
//   // static parse(array, parent = null) {
//   //   let tree = new Tree(parent)
//   //   for (let el of array) {
//   //     let node
//   //     if (Array.isArray(el)) {
//   //       node = Tree.parse(el)
//   //     } else {
//   //       node = new Leaf(el, tree)
//   //     }
//   //     tree.children.push(node)
//   //   }
//   //   return tree
//   // }

//   constructor(data, parent, children = []) {
//     this.data = data
//     this.parent = parent
//     this.children = children
//   }

//   *[Symbol.iterator]() {
//     yield this
//     for (let child of this.children) {
//       yield* child
//     }
//   }
// }

class Delta {
  constructor(ops) {
    this.ops = ops ? Array.wrap(ops) : []
  }

  [Symbol.iterator]() {
    return this.ops[Symbol.iterator]()
  }

  retain(length) {
    return this.push('retain', length)
  }

  descend() {
    return this.push('descend')
  }

  ascend() {
    return this.push('ascend')
  }

  insert(...items) {
    return this.push('insert', ...items)
  }

  delete(length) {
    return this.push('delete', length)
  }

  wrap(length) {
    return this.push('wrap', length)
  }

  unwrap(offset, count) {
    return this.push('unwrap', offset, count)
  }

  split(length) {
    return this.unwrap(length).wrap(length)
  }

  // invert() {
  //   switch('foo') {
  //     case 'wrap':
  //       return ['unwrap', ...args]
  //     case 'unwrap':
  //       return ['wrap', ...args]
  //   }
  // }

  push(...args) {
    this.ops.push(args)
    return this
  }

  applyTo(tree) {
    let node = tree
    let offset = 0
    let parents = []
    let parentOffsets = []
    for (let [type, ...args] of this.ops) {
      let count
      switch (type) {
      case 'retain':
        offset += args[0]
        break
      case 'descend':
        if (!Array.isArray(node[offset])) {
          throw new Error('cannot descend into non-array')
        }
        parents.push(node)
        parentOffsets.push(offset)
        node = node[offset]
        offset = 0
        break
      case 'ascend':
        if (parents.length < 1) {
          throw new Error('cannot ascend from root node')
        }
        node = parents.pop()
        offset = parentOffsets.pop() + 1
        break
      case 'insert':
        node.splice(offset, 0, ...args)
        offset += args.length
        break
      case 'delete':
        count = args[0]
        node.splice(offset, count)
        break
      case 'wrap':
        count = args[0]
        let items = node.slice(offset, offset + count)
        node.splice(offset, count, items)
        break
      case 'unwrap':
        let child = node[offset]
        if (!Array.isArray(child)) {
          throw new Error('cannot unwrap non-array')
        }
        count = args[0]
        if (child.length == count) {
          // don't leave empty array behind
          node.splice(offset, 1, ...child)
        } else {
          node.splice(offset, 0, ...child.splice(0, count))
        }
        break
      }
    }
    return tree
  }

  composeWith(other) {
    for (let [a, b] of opPairs(this.ops, other.ops)) {
      switch (a[0] + b[0]) {
      case ''
      }
    }
  }

  transformCursor(path, tiebreaker) {
    let parentOffsets = []
    let offset = 0
    let depth = 0
    path = Array.from(path)
    for (let [type, ...args] of this.ops) {
      let count
      switch (type) {
      case 'retain':
        offset += args[0]
        break
      case 'descend':
        parentOffsets.push(offset)
        offset = 0
        depth += 1
        break
      case 'ascend':
        offset = parentOffsets.pop() + 1
        depth -= 1
        break
      case 'insert':
          if (depth < path.length &&
              offset <= path[depth] &&
              prefixMatch(parentOffsets, path)) {
          path[depth] += args.length
        }
        offset += args.length
        break
      case 'delete':
        let length = args[0]
        if (depth < path.length &&
            offset <= path[depth] &&
            prefixMatch(parentOffsets, path)) {
          path[depth] -= length // TODO: Math.min(length, path[depth] - offset)?
        }
        break
      case 'wrap':
        count = args[0]
        if (depth < path.length &&
            offset <= path[depth] &&
            prefixMatch(parentOffsets, path)) {
          if (offset + count <= path[depth]) {
            path[depth] -= count - 1
          } else {
            path.splice(depth, 1, offset, path[depth] - offset)
          }
        }
        break
      case 'unwrap':
        count = args[0]
        if (depth < path.length &&
            offset <= path[depth] &&
            prefixMatch(parentOffsets, path)) {
          if (offset + count >= path[depth]) {
            path[depth] += count
          } else if (depth < path.length - 1) {
            path.splice(depth, 2, path[depth] + path[depth + 1])
          }
        }
      }
    }
    return path
  }
}

function prefixMatch(a, b) {
  for (let i = 0, len = Math.min(a.length, b.length); i < len; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

module.exports = {
  Delta,
  name: 'tree',
  uri: 'https://github.com/thomsbg/tree-ottype',
  create(tree) {
    return tree
  },
  apply(tree, ops) {
    return new Delta(ops).applyTo(tree)
  },
  compose(a, b) {
    return new Delta(a).composeWith(new Delta(b)).ops
  },
  transform(a, b, side) {
    return new Delta(a).transformAgainst(b, side === 'right').ops
  },
  transformCursor(cursor, delta, isOwnOp) {
    return new Delta(delta).transformCursor(cursor, isOwnOp)
  }
};
