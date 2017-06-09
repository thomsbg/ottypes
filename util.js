var _ = module.exports;

_.forOwn = function(obj, cb, ctx) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      cb.call(ctx, key, obj[key]);
    }
  }
};

_.defaults = function(target) {
  var sources = Array.prototype.slice.call(arguments, 1);
  var assign = function(key, val) {
    if (!target.hasOwnProperty(key)) {
      target[key] = val;
    }
  };
  for (var i = 0; i < sources.length; i++) {
    _.forOwn(sources[i], assign);
  }
  return target;
};

_.clone = function(source) {
  return _.defaults({}, source);
};

_.isArray = function (value) {
  return Array.isArray(value);
};

_.isNumber = function (value) {
  if (typeof value === 'number') return true;
  if (typeof value === 'object' && Object.prototype.toString.call(value) === '[object Number]') return true;
  return false;
};

_.isObject = function (value) {
  if (!value) return false;
  return (typeof value === 'function' || typeof value === 'object');
};

_.isString = function (value) {
  if (typeof value === 'string') return true;
  if (typeof value === 'object' && Object.prototype.toString.call(value) === '[object String]') return true;
  return false;
};

_.opLength = function(op) {
  if (_.isNumber(op.d)) {
    return op.d;
  } else if (_.isNumber(op.r)) {
    return op.r;
  } else if (_.isString(op.i)) {
    return op.i.length;
  } else {
    return 0;
  }
};
