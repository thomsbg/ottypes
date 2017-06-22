'use strict';

var name = 'register';

function create(val) {
  return val;
}

function apply(prev, val) {
  return val;
}

function transform(a, b, side) {
  return side === 'left' ? a : b;
}

function compose(a, b) {
  return b;
}

module.exports = { name: name, create: create, apply: apply, transform: transform, compose: compose };