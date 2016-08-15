const deepEqual = require('assert').deepEqual;
const utils = require('../utils');
const describe = require('mocha').describe;
const it = require('mocha').it;

describe('Intersect objects', function () {
  'use strict';

  it('should return a new object with only the properties that exist and have the same value in both objects', function () {
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
      p1: true
    };
    utils.intersect(object1, object2);

    deepEqual(object1, expected);
  });

  it('should return the same object if intersected to itself', function () {
    var object1 = {
      p1: true,
      p2: 'test'
    };

    var expected = Object.assign({}, object1);

    utils.intersect(object1, object1);

    deepEqual(object1, expected);
  });

  it('should return an empty object if intersection is null', function () {
    var object1 = {
      p1: true,
      p2: 'test'
    };
    var object2 = {
      another: true
    };

    var expected = {};

    utils.intersect(object1, object2);

    deepEqual(object1, expected);
  });

});
