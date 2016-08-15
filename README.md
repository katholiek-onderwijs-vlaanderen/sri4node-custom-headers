# About [![Build Status](https://travis-ci.org/rodrigouroz/sri4node-custom-headers.svg?branch=master)](https://travis-ci.org/rodrigouroz/sri4node-custom-headers)

A module that allows to customize response headers in a [sri4node](https://github.com/dimitrydhondt/sri4node) backend

# Installing

Installation is simple using npm :

    $ cd [your_project]
    $ npm install --save sri4node-custom-headers

# Usage

The module must be initialized and it returns an object with three functions.

```
var customHeaders = require('sri4node-custom-headers')(pg, config, sri4node.utils, require('../cache-control.json'));
```

The arguments are:

- `pg`: a postgres object (https://www.npmjs.com/package/pg)
- `config`: a configuration object with the attributes: ```{defaultdatabaseurl: databaseUrl, logsql: verbose}```
- `sri4node.utils`: See [General Utilities](https://github.com/dimitrydhondt/sri4node#general-utilities)
- `rules`: The configuration rules.

The rules file has the form:
```
[
  {
    "selectionUrls": ["/content?type=VISION_TEXT"],
    "headers": {
      "Cache-Control": "no-store",
      "Expires": -1,
      "Surrogate-Cache-Control": "xx"
    }
  },
  {
    "selectionUrls": ["/content"],
    "headers": {
      "Expires": 100,
      "Test": "TestHeader"
    }
  }
]
```

This returns an object with the following functions:

- `addHeaders`: an afterread function implementation [(Check afterread in sri4node)](https://github.com/dimitrydhondt/sri4node#afterread)
- `purgeHeaders`: an afterinsert function implementation [(Check afterinsert in sri4node)](https://github.com/dimitrydhondt/sri4node#afterupdate--afterinsert)
- `purgeHeadersOnDelete`: a secure function implementation that checks a DELETE method [(Check secure in sri4node)](https://github.com/dimitrydhondt/sri4node#secure)

In order to configure a resource to use this module, these functions must be configured in the right sections.

Example:

```
sri4node.configure(app, pg, {
  ...,
  resources: [
    {
        type: '/content',
        public: false,
        secure: [
          customHeaders.purgeHeadersOnDelete
        ],
        ...,
        afterread: [
          customHeaders.addHeaders
        ],
        afterupdate: [
          customHeaders.purgeHeaders
        ],
        afterinsert: [
          customHeaders.purgeHeaders
        ],
        ...
    }
  ]
});
```

The rules are processed at initialization time, the selection urls are expanded directly in the database and a cache is built with keys being the resources permalinks
and the value is an object with the full set of headers to return for that permalink.
If several rules apply for the same resource headers are merged. Conflicting headers (same header with different value) are **discarded**

Each time a resource is modified, `purgeHeaders` is called. This method deletes the cache for the modified elements and triggers a new processing of the rules after a
fixed period of time (2s). This is so because the current transaction where the changes are made is not closed after every other after* functio is applied in sri4node
and we don't want to block the current execution. A better approach would be to create an aftercommit function in sri4node.

Each time a resource is delete, `purgeHeadersOnDelete` is called. This method only deletes the cache since there's no need to process the rules again because there will
be no changes to the other elements.

When a request for headers is made (on a GET operation), the `addHeaders` function is called and the headers for the full set of elements is calculated. 
**A header must be present in every resource in order to be returned**. That means that if the response has elements A, B and C, and in the cache we have header X 
only for element A and B, nothing is returned (empty headers).