/**
 * Created by rodrigouroz on 12/8/16.
 */

const urlModule = require('url');
const cache = Object.create(null);
const utils = require('./utils');
var sriUtils;
var pg;
var config;
var rules;

/**
 * The cache is created for a path that does not exist or merged if previously set
 * @param url
 * @param headers
 */
function setCache(url, headers) {
  'use strict';
  if (cache[url]) {
    utils.merge(cache[url], headers);
  } else {
    cache[url] = headers;
  }
}

/**
 * Processes a single rule (an entry in the array)
 * @param rule
 * @param database
 */
function expandRule(rule, database) {
  'use strict';

  /**
   * Processes a single selection in the array of selection urls for the same rule
   * @param selectionUrl
   */
  function expandSelection(selectionUrl) {
    var url = urlModule.parse(selectionUrl, true);
    var query = sriUtils.prepareSQL('expand-url');

    // special case
    if (selectionUrl === url.pathname) {
      setCache('*', rule.headers);
    } else {
      sriUtils.convertListResourceURLToSQL(url.pathname, url.query, false, database, query)
        .then(function () {
          return sriUtils.executeSQL(database, query);
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

/**
 * Opens a db connection and process the configured rules, this updates the cache
 */
function processRules() {

  'use strict';

  var db;

  sriUtils.getConnection(pg, config)
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

/**
 * Calculates all the headers that must be set. Every element must have the same header key and value to be set, the special
 * case of * is for every element
 * @param elements
 */
function getHeaders(elements) {
  'use strict';
  var headers = Object.assign({}, cache[elements[0].$$meta.permalink]);

  for (let i = 1; i < elements.length; i++) {
    utils.intersect(headers, cache[elements[i].$$meta.permalink]);
  }

  // special case
  utils.merge(headers, cache['*']);

  return headers;
}

module.exports = function sri4nodeCustomHeaders(postgres, configuration, sri4nodesriUtils, initRules) {
  'use strict';

  sriUtils = sri4nodesriUtils;
  pg = postgres;
  config = configuration;
  rules = initRules;

  processRules();

  /**
   * Called on read, adds headers from the cache
   * @param database
   * @param elements
   * @param me
   * @param route
   * @param headerFn
   */
  function addHeaders(database, elements, me, route, headerFn) {

    if (Array.isArray(elements) && elements.length > 0) {
      headerFn(getHeaders(elements));
    }

  }

  /**
   * This method is used for insert and update. Check if the element is cached, purge it, and trigger a new processing of the rules
   * @param database
   * @param elements
   * @param me
   * @param route
   */
  function purgeHeaders(database, elements) {
    if (Array.isArray(elements) && elements.length > 0) {
      for (let i = 0; i < elements.length; i++) {
        delete cache[elements[i].path];
      }
      /**
       * We give 2 seconds because we need sri4node to commit the transaction since this runs in a different transaction
       * TODO Implement an afterupdate function in sri4node that is called AFTER the transaction is committed.
       */
      setTimeout(function () {
        processRules();
      }, 2000);
    }
  }

  /**
   * Called on delete, purges the elements if they exist in cache. Doesn't trigger a new processing since the elements are deleted
   * @param req
   */
  function purgeHeadersOnDelete(req) {
    // this is called from a secure function in sri4node, which is used on each Request
    // we only continue if the request is a DELETE operation
    if (req.method === 'DELETE') {
      delete cache[req.route.path];
    }
  }

  return {
    addHeaders: addHeaders,
    purgeHeaders: purgeHeaders,
    purgeHeadersOnDelete: purgeHeadersOnDelete
  };

};