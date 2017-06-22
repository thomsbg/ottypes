'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var name = 'set';

function create(items) {
  return new Set(items);
}

function serialize(set) {
  return [].concat(_toConsumableArray(set));
}

function deserialize(items) {
  return new Set(items);
}

function apply(set, delta) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = delta.add[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var item = _step.value;

      set.add(item);
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

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = delta.del[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var _item = _step2.value;

      set.delete(_item);
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

function compose(a, b) {
  return {
    add: new Set([].concat(_toConsumableArray(a.add), _toConsumableArray(b.add))),
    del: new Set([].concat(_toConsumableArray(a.del), _toConsumableArray(b.del)))
  };
}

function transform(a, b, side) {
  if (side == 'left') {
    return {
      add: new Set([].concat(_toConsumableArray(a.add)).filter(function (x) {
        return !b.add.has(x);
      })),
      del: new Set([].concat(_toConsumableArray(a.del)).filter(function (x) {
        return !b.del.has(x);
      }))
    };
  } else {
    return {
      add: new Set([].concat(_toConsumableArray(a.add)).filter(function (x) {
        return !b.add.has(x) && !b.del.has(x);
      })),
      del: new Set([].concat(_toConsumableArray(b.del)).filter(function (x) {
        return !b.add.has(x) && !b.del.has(x);
      }))
    };
  }
}

module.exports = { name: name, create: create, serialize: serialize, deserialize: deserialize, apply: apply, compose: compose, transform: transform };