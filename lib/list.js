'use strict';

// register ottypes
require('./index');

var ottypes = require('ottypes');

exports.name = 'list';
exports.create = function (initial) {
  return initial.slice();
};

exports.apply = function (snapshot, delta) {
  var newSnapshot = [];
  var offset = 0;
  var op, subtype;
  for (var i = 0; i < delta.length; i++) {
    op = delta[i];
    if (_.isNumber(r)) {
      // retain
      newSnapshot = newSnapshot.concat(snapshot.slice(offset, op.r));
      offset += op.r;
    } else if (_.isString(op.i)) {
      // insert
      newSnapshot.push(op.i);
    } else if (_.isNumber(op.d)) {
      // delete
      offset += op.d;
    } else if (_.isString(op.t) && 'o' in op) {
      // apply subtype
      subtype = ottypes[op.t];
      if (!subtype) throw new Error('unknown subtype: ' + op.t);
      newSnapshot.push(subtype.apply(snapshot[offset], op.o));
      offset += 1;
    } else {
      throw new Error('unknown op format: ' + JSON.stringify(op));
    }
  }
  // implicit trailing retain
  return newSnapshot.concat(snapshot.slice(offset));
};

// exports.apply = function(snapshot, op) {
//   var index = op[0];
//   var delta = op[1];

//   if (index > snapshot.length || index < 0) {
//     throw new Error('index out of bounds, index: ' + index + ', snapshot length: ' + snapshot.length);
//   }

//   if (index == snapshot.length && ('m' in delta || 'd' in delta)) {
//     throw new Error('index out of bounds, cannot move / delete at index: ' + index + ', snapshot length: ' + snapshot.length);
//   }

//   if ('t' in delta && 'o' in delta) {
//     // apply sub-type op
//     var type = ottypes[delta.t];
//     if (!type) throw new Error('unknown type: ' + delta.t);
//     type.apply(snapshot[index], delta.o);
//   } else if ('m' in delta) {
//     // move
//     var removed = snapshot.splice(index, 1);
//     snapshot.splice(delta.m, 0, removed[0]);
//   } else if ('i' in delta && 'd' in delta) {
//     // replace
//     if (snapshot[index] !== delta.d) throw new Error('attempted to replace non-matching value at index: ' + index + ', expected: ' + delta.d + ', got: ' + snapshot[index]);
//     snapshot.splice(index, 1, delta.i);
//   } else if ('i' in delta) {
//     // insert
//     snapshot.splice(index, 0, delta.i);
//   } else if ('d' in delta) {
//     // delete
//     if (snapshot[index] !== delta.d) throw new Error('attempted to delete non-matching value at index: ' + index + ', expected: ' + delta.d + ', got: ' + snapshot[index]);
//     snapshot.splice(index, 1);
//   } else {
//     throw new Error('unrecognized op format: ' + JSON.stringify(op));
//   }

//   return snapshot;
// };

exports.transform = function (op1, op2, side) {};

exports.compose = function (op1, op2) {};

ottypes.list = module.exports;