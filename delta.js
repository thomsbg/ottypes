var _ = require('./util');
var iterate = require('./iterate');

var Delta = function (ops) {
  // Assume we are given a well formed ops
  if (_.isArray(ops)) {
    this.ops = ops;
  } else if (_.isObject(ops) && _.isArray(ops.ops)) {
    this.ops = ops.ops;
  } else {
    this.ops = [];
  }
};

Delta.prototype.insert = function (text) {
  var newOp = {};
  if (_.isString(text)) {
    if (text.length === 0) return this;
    newOp.i = text;
  }
  return this.push(newOp);
};

Delta.prototype['delete'] = function (length) {
  if (length <= 0) return this;
  return this.push({ d: length });
};

Delta.prototype.retain = function (length) {
  if (length <= 0) return this;
  var newOp = { r: length };
  return this.push(newOp);
};

Delta.prototype.push = function (newOp) {
  var index = this.ops.length;
  var lastOp = this.ops[index - 1];
  newOp = _.clone(newOp);
  if (_.isObject(lastOp)) {
    // Combine consecutive deletes into one
    if (_.isNumber(newOp.d) && _.isNumber(lastOp.d)) {
      this.ops[index - 1] = { d: lastOp.d + newOp.d };
      return this;
    }
    // Combine conescutive inserts into one
    if (_.isString(newOp.i) && _.isString(lastOp.i)) {
      this.ops[index - 1] = { i: lastOp.i + newOp.i };
      return this;
    }
    // Since it does not matter if we insert before or after deleting at the same index,
    // always prefer to insert first
    if (_.isNumber(lastOp.d) && _.isString(newOp.i)) {
      index -= 1;
      lastOp = this.ops[index - 1];
      if (!_.isObject(lastOp)) {
        this.ops.unshift(newOp);
        return this;
      }
    }
  }
  this.ops.splice(index, 0, newOp);
  return this;
};

Delta.prototype.chop = function () {
  var lastOp = this.ops[this.ops.length - 1];
  if (lastOp && lastOp.r) {
    this.ops.pop();
  }
  return this;
};

Delta.prototype.length = function () {
  return this.ops.reduce(function (length, elem) {
    return length + _.opLength(elem);
  }, 0);
};

Delta.prototype.slice = function (start, end) {
  start = start || 0;
  if (!_.isNumber(end)) end = Infinity;
  var delta = new Delta();
  var iter = iterate(this.ops);
  var index = 0;
  while (index < end && iter.hasNext()) {
    var nextOp;
    if (index < start) {
      nextOp = iter.next(start - index);
    } else {
      nextOp = iter.next(end - index);
      delta.push(nextOp);
    }
    index += _.opLength(nextOp);
  }
  return delta;
};

Delta.prototype.compose = function (other) {
  var thisIter = iterate(this.ops);
  var otherIter = iterate(other.ops);
  this.ops = [];
  while (thisIter.hasNext() || otherIter.hasNext()) {
    if (otherIter.peekType() === 'insert') {
      this.push(otherIter.next());
    } else if (thisIter.peekType() === 'delete') {
      this.push(thisIter.next());
    } else {
      var length = Math.min(thisIter.peekLength(), otherIter.peekLength());
      var thisOp = thisIter.next(length);
      var otherOp = otherIter.next(length);
      if (_.isNumber(otherOp.r)) {
        var newOp = {};
        if (_.isNumber(thisOp.r)) {
          newOp.r = length;
        } else {
          newOp.i = thisOp.i;
        }
        this.push(newOp);
      // Other op should be delete, we could be an insert or retain
      // Insert + delete cancels out
      } else if (_.isNumber(otherOp.d) && _.isNumber(thisOp.r)) {
        this.push(otherOp);
      }
    }
  }
  return this.chop();
};

Delta.prototype.transform = function (other, priority) {
  priority = !!priority;
  if (_.isNumber(other)) {
    return this.transformPosition(other, priority);
  }
  var thisIter = iterate(this.ops);
  var otherIter = iterate(other.ops);
  var delta = new Delta();
  while (thisIter.hasNext() || otherIter.hasNext()) {
    if (thisIter.peekType() === 'insert' && (priority || otherIter.peekType() !== 'insert')) {
      delta.retain(_.opLength(thisIter.next()));
    } else if (otherIter.peekType() === 'insert') {
      delta.push(otherIter.next());
    } else {
      var length = Math.min(thisIter.peekLength(), otherIter.peekLength());
      var thisOp = thisIter.next(length);
      var otherOp = otherIter.next(length);
      if (thisOp.d) {
        // Our delete either makes their delete redundant or removes their retain
        continue;
      } else if (otherOp.d) {
        delta.push(otherOp);
      } else {
        // We retain either their retain or insert
        delta.retain(length);
      }
    }
  }
  return delta.chop();
};

Delta.prototype.transformPosition = function (index, priority) {
  priority = !!priority;
  var thisIter = iterate(this.ops);
  var offset = 0;
  while (thisIter.hasNext() && offset <= index) {
    var length = thisIter.peekLength();
    var nextType = thisIter.peekType();
    thisIter.next();
    if (nextType === 'delete') {
      index -= Math.min(length, index - offset);
      continue;
    } else if (nextType === 'insert' && (offset < index || !priority)) {
      index += length;
    }
    offset += length;
  }
  return index;
};

module.exports = Delta;
