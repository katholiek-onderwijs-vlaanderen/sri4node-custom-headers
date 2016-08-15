/**
 * Created by rodrigouroz on 15/8/16.
 */
/**
 * This function merges `source` into `object` disabling conflicting properties (properties that exist
 * in both objects with different values)
 * @param object
 * @param source
 */

function merge(object, source) {
  'use strict';
  var key;
  if (object && source) {
    for (key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (!object[key]) {
          object[key] = source[key];
        } else if (object[key] !== source[key]) {
          delete object[key];
        }
      }
    }
  }
}

function intersect(object, source) {
  'use strict';
  var key;
  if (object) {
    for (key in object) {
      if (!source || !source[key] || source[key] !== object[key]) {
        delete object[key];
      }
    }
  }
}

module.exports = {
  merge: merge,
  intersect: intersect
};