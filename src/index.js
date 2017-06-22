require('babel-polyfill')

const register = require('./register')
const set = require('./set')
const map = require('./map')
const list = require('./list')
const tree = require('./tree')

module.exports = { register, set, map, list, tree }
