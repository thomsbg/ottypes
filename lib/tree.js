'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

var Delta = function () {
  function Delta(ops) {
    _classCallCheck(this, Delta);

    this.ops = ops ? Array.wrap(ops) : [];
  }

  _createClass(Delta, [{
    key: Symbol.iterator,
    value: function value() {
      return this.ops[Symbol.iterator]();
    }
  }, {
    key: 'retain',
    value: function retain(length) {
      return this.push('retain', length);
    }
  }, {
    key: 'descend',
    value: function descend() {
      return this.push('descend');
    }
  }, {
    key: 'ascend',
    value: function ascend() {
      return this.push('ascend');
    }
  }, {
    key: 'insert',
    value: function insert() {
      for (var _len = arguments.length, items = Array(_len), _key = 0; _key < _len; _key++) {
        items[_key] = arguments[_key];
      }

      return this.push.apply(this, ['insert'].concat(items));
    }
  }, {
    key: 'delete',
    value: function _delete(length) {
      return this.push('delete', length);
    }
  }, {
    key: 'wrap',
    value: function wrap(length) {
      return this.push('wrap', length);
    }
  }, {
    key: 'unwrap',
    value: function unwrap(offset, count) {
      return this.push('unwrap', offset, count);
    }
  }, {
    key: 'split',
    value: function split(length) {
      return this.unwrap(length).wrap(length);
    }

    // invert() {
    //   switch('foo') {
    //     case 'wrap':
    //       return ['unwrap', ...args]
    //     case 'unwrap':
    //       return ['wrap', ...args]
    //   }
    // }

  }, {
    key: 'push',
    value: function push() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      this.ops.push(args);
      return this;
    }
  }, {
    key: 'applyTo',
    value: function applyTo(tree) {
      var _node;

      var node = tree;
      var offset = 0;
      var parents = [];
      var parentOffsets = [];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.ops[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _ref = _step.value;

          var _ref2 = _toArray(_ref);

          var type = _ref2[0];

          var _args = _ref2.slice(1);

          var count = void 0;
          switch (type) {
            case 'retain':
              offset += _args[0];
              break;
            case 'descend':
              if (!Array.isArray(node[offset])) {
                throw new Error('cannot descend into non-array');
              }
              parents.push(node);
              parentOffsets.push(offset);
              node = node[offset];
              offset = 0;
              break;
            case 'ascend':
              if (parents.length < 1) {
                throw new Error('cannot ascend from root node');
              }
              node = parents.pop();
              offset = parentOffsets.pop() + 1;
              break;
            case 'insert':
              (_node = node).splice.apply(_node, [offset, 0].concat(_toConsumableArray(_args)));
              offset += _args.length;
              break;
            case 'delete':
              count = _args[0];
              node.splice(offset, count);
              break;
            case 'wrap':
              count = _args[0];
              var _items = node.slice(offset, offset + count);
              node.splice(offset, count, _items);
              break;
            case 'unwrap':
              var child = node[offset];
              if (!Array.isArray(child)) {
                throw new Error('cannot unwrap non-array');
              }
              count = _args[0];
              if (child.length == count) {
                var _node2;

                // don't leave empty array behind
                (_node2 = node).splice.apply(_node2, [offset, 1].concat(_toConsumableArray(child)));
              } else {
                var _node3;

                (_node3 = node).splice.apply(_node3, [offset, 0].concat(_toConsumableArray(child.splice(0, count))));
              }
              break;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return tree;
    }
  }, {
    key: 'composeWith',
    value: function composeWith(other) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = opPairs(this.ops, other.ops)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _ref3 = _step2.value;

          var _ref4 = _slicedToArray(_ref3, 2);

          var a = _ref4[0];
          var b = _ref4[1];

          switch (a[0] + b[0]) {}
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  }, {
    key: 'transformCursor',
    value: function transformCursor(path, tiebreaker) {
      var parentOffsets = [];
      var offset = 0;
      var depth = 0;
      path = Array.from(path);
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.ops[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _ref5 = _step3.value;

          var _ref6 = _toArray(_ref5);

          var type = _ref6[0];

          var _args2 = _ref6.slice(1);

          var count = void 0;
          switch (type) {
            case 'retain':
              offset += _args2[0];
              break;
            case 'descend':
              parentOffsets.push(offset);
              offset = 0;
              depth += 1;
              break;
            case 'ascend':
              offset = parentOffsets.pop() + 1;
              depth -= 1;
              break;
            case 'insert':
              if (depth < path.length && offset <= path[depth] && prefixMatch(parentOffsets, path)) {
                path[depth] += _args2.length;
              }
              offset += _args2.length;
              break;
            case 'delete':
              var length = _args2[0];
              if (depth < path.length && offset <= path[depth] && prefixMatch(parentOffsets, path)) {
                path[depth] -= length; // TODO: Math.min(length, path[depth] - offset)?
              }
              break;
            case 'wrap':
              count = _args2[0];
              if (depth < path.length && offset <= path[depth] && prefixMatch(parentOffsets, path)) {
                if (offset + count <= path[depth]) {
                  path[depth] -= count - 1;
                } else {
                  path.splice(depth, 1, offset, path[depth] - offset);
                }
              }
              break;
            case 'unwrap':
              count = _args2[0];
              if (depth < path.length && offset <= path[depth] && prefixMatch(parentOffsets, path)) {
                if (offset + count >= path[depth]) {
                  path[depth] += count;
                } else if (depth < path.length - 1) {
                  path.splice(depth, 2, path[depth] + path[depth + 1]);
                }
              }
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return path;
    }
  }]);

  return Delta;
}();

function prefixMatch(a, b) {
  for (var i = 0, len = Math.min(a.length, b.length); i < len; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

module.exports = {
  Delta: Delta,
  name: 'tree',
  uri: 'https://github.com/thomsbg/tree-ottype',
  create: function create(tree) {
    return tree;
  },
  apply: function apply(tree, ops) {
    return new Delta(ops).applyTo(tree);
  },
  compose: function compose(a, b) {
    return new Delta(a).composeWith(new Delta(b)).ops;
  },
  transform: function transform(a, b, side) {
    return new Delta(a).transformAgainst(b, side === 'right').ops;
  },
  transformCursor: function transformCursor(cursor, delta, isOwnOp) {
    return new Delta(delta).transformCursor(cursor, isOwnOp);
  }
};