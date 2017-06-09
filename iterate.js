var _ = require('./util');

module.exports = function(ops) {
  return new Iterator(ops);
};

function Iterator(ops) {
  this.ops = ops;
  this.index = 0;
  this.offset = 0;
}

Iterator.prototype.hasNext = function() {
  return this.peekLength() < Infinity;
};

Iterator.prototype.next = function(length) {
  if (!length) length = Infinity;
  var nextOp = this.ops[this.index];
  if (nextOp) {
    var offset = this.offset;
    var opLength = _.opLength(nextOp);
    if (length >= opLength - offset) {
      length = opLength - offset;
      this.index += 1;
      this.offset = 0;
    } else {
      this.offset += length;
    }
    if (_.isNumber(nextOp.d)) {
      return { d: length };
    } else {
      var retOp = {};
      if (nextOp.attributes) {
        retOp.attributes = nextOp.attributes;
      }
      if (_.isNumber(nextOp.r)) {
        retOp.r = length;
      } else if (_.isString(nextOp.i)) {
        retOp.i = nextOp.i.substr(offset, length);
      } else {
        // offset should === 0, length should === 1
        retOp.i = nextOp.i;
      }
      return retOp;
    }
  } else {
    return { r: Infinity };
  }
};

Iterator.prototype.peekLength = function() {
  if (this.ops[this.index]) {
    // Should never return 0 if our index is being managed correctly
    return _.opLength(this.ops[this.index]) - this.offset;
  } else {
    return Infinity;
  }
};

Iterator.prototype.peekType = function() {
  var nextOp = this.ops[this.index];
  if (nextOp) {
    if (_.isNumber(nextOp.d)) {
      return 'delete';
    } else if (_.isNumber(nextOp.r)) {
      return 'retain';
    } else {
      return 'insert';
    }
  }
  return 'retain';
};
