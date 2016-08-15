const deepEqual = require('assert').deepEqual;
const utils = require('../utils');
const describe = require('mocha').describe;
const it = require('mocha').it;

describe('Merge objects', function () {
  'use strict';

  it('should return a new object with the union of properties from both objects, discarding conflicting values', function () {
    var object1 = {
      p1: true,
      p2: 'test'
    };
    var object2 = {
      p1: true,
      p2: false,
      p3: 'other'
    };
    var expected = {
      p1: true,
      p3: 'other'
    };
    utils.merge(object1, object2);

    deepEqual(object1, expected);
  });

  it('should return the same object if merged to itself', function () {
    var object1 = {
      p1: true,
      p2: 'test'
    };

    var expected = Object.assign({}, object1);

    utils.merge(object1, object1);

    deepEqual(object1, expected);
  });

});
