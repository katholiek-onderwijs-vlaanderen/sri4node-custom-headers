/**
 * Created by rodrigouroz on 12/8/16.
 */

//var q = require('q');
var urlModule = require('url');
var cache = Object.create(null);
var utils;
var pg;
var config;

/**
 * This function merges `source` into `object` disabling conflicting properties (properties that exist
 * in both objects with different values)
 * @param object
 * @param source
 */
// TODO Create unit tests
function merge(object, source) {
  "use strict";
  var key;
  if (!object) {
    object = source;
  } else if (source) {
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

function setCache(url, headers) {
  "use strict";
  console.log(url);
  if (cache[url]) {
    merge(cache[url], headers);
  } else {
    cache[url] = headers;
  }
}
function expandRule(rule, database) {
  "use strict";

  function expandSelection(selectionUrl) {
    var url = urlModule.parse(selectionUrl, true);
    var query = utils.prepareSQL('expand-url');

    // special case
    if (selectionUrl === url.pathname) {
      setCache('*', rule.headers);
    } else {
      utils.convertListResourceURLToSQL(url.pathname, url.query, false, database, query)
        .then(function () {
          return utils.executeSQL(database, query);
        })
        .then(function (result) {
          for (let j = 0; j < result.rows.length; j++) {
            setCache(url.pathname + '/' + result.rows[j].key, rule.headers);
          }
        });
    }

  }

  if (Array.isArray(rule.selectionUrls)) {
    for (let i = 0; i < rule.selectionUrls.length; i++) {

      expandSelection(rule.selectionUrls[i]);

    }
  }

}

function init(rules) {

  "use strict";

  var db;

  utils.getConnection(pg, config)
    .then(function (database) {
      db = database;

      if (Array.isArray(rules)) {
        for (let i = 0; i < rules.length; i++) {
          expandRule(rules[i], db);
        }
      }
    })
    .finally(function () {
      db.done();
    });
}

// TODO Create unit tests
function intersect(object, source) {
  "use strict";
  var key;
  if (object) {
    for (key in object) {
      if (!source || !source[key] || source[key] !== object[key]) {
        delete object[key];
      }
    }
  }
}

function getHeaders(elements) {
  "use strict";
  var headers = Object.assign({}, cache[elements[0].$$meta.permalink]);

  for (let i = 1; i < elements.length; i++) {
    intersect(headers, cache[elements[i].$$meta.permalink]);
  }

  // special case
  merge(headers, cache['*']);

  return headers;
}

// TODO Implement purging (on afterupdate and afterdelete)
module.exports = function sri4nodeCustomHeaders(postgres, configuration, sri4nodeUtils, rules) {
  "use strict";

  utils = sri4nodeUtils;
  pg = postgres;
  config = configuration;

  init(rules);

  return function (database, elements, me, route, headerFn) {

    if (Array.isArray(elements) && elements.length > 0) {
      headerFn(getHeaders(elements));
    }

  };

};