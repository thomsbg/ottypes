// register types
require('./index');

var _ = require('./util');
var ottypes = require('ottypes');

function Type(mapping, defaultType) {
  this.mapping = {};
  _.forOwn(mapping, function(key, val) {
    var type = ottypes[val];
    if (!type) throw new Error('unknown ottype: ' + val);
    this.mapping[key] = type;
  }, this);

  if (defaultType && !ottypes[defaultType]) {
    throw new Error('unknown ottype: ' + defaultType);
  } else if (defaultType) {
    this.defaultType = ottypes[defaultType];
  }
}

module.exports = new Type({}, 'scalar');
module.exports.name = 'map';
module.exports.define = function define(mapping, defaultType) {
  return new Type(mapping, defaultType);
};

function create(data) {
  // return new 
  var snapshot = {};
  _.forOwn(initial, function(key, val) {
    var type = this.mapping[key] || this.defaultType;
    if (!type) throw new Error('key not in mapping: ' + key);
    snapshot[key] = type.create(val);
  }, this);
  return snapshot;
}

Type.prototype.apply = function(snapshot, op) {
  _.forOwn(op, function(key, val) {
    var type = this.mapping[key] || this.defaultType;
    if (!type) throw new Error('key not in mapping: ' + key);
    snapshot[key] = type.apply(snapshot[key] || type.create(), val);
  }, this);
  return snapshot;
};

Type.prototype.transform = function(op1, op2, side) {
  var newOp = {};
  _.forOwn(op2, function(key, val) {
    var type = this.mapping[key] || this.defaultType;
    if (!type) throw new Error('key not in mapping: ' + key);
    if (op1.hasOwnProperty(key)) {
      newOp[key] = type.transform(op1[key], op2[key], side);
    } else {
      newOp[key] = op2[key];
    }
  }, this);
  _.defaults(newOp, op1);
  return newOp;
};

Type.prototype.compose = function(op1, op2) {
  var newOp = {};
  _.forOwn(op2, function(key, val) {
    var type = this.mapping[key] || this.defaultType;
    if (!type) throw new Error('key not in mapping: ', key);
    if (op1[key]) {
      newOp[key] = type.compose(op1[key], op2[key]);
    } else {
      newOp[key] = op2[key];
    }
  }, this);
  _.defaults(newOp, op1);
  return newOp;
};
