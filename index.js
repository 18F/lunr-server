'use strict';

var http = require('http');
var lunr = require('lunr');
var fs = require('fs');
var path = require('path');
var packageInfo = require('./package.json');
var querystring = require('querystring');
var url = require('url');

module.exports = LunrServer;

function LunrServer(config, logger) {
  var server = this;

  this.logger = logger;
  Object.keys(config).forEach(function(key) {
    server[key] = config[key];
  });
}

LunrServer.versionString = function() {
  return packageInfo.name + ' v' + packageInfo.version;
};

LunrServer.prototype.launch = function() {
  var lunrServer = this;

  return Promise.all(this.corpora.map(function(corpusSpec) {
    return loadIndex(lunrServer, corpusSpec);
  }))
  .then(function() {
    return new Promise(function(resolve, reject) {
      launchServer(lunrServer, reject);
    });
  });
};

function loadIndex(server, corpusSpec) {
  var indexPath = path.join(corpusSpec.indexPath);

  return new Promise(function(resolve, reject) {
    fs.readFile(indexPath, 'utf8', function(err, data) {
      if (err) {
        return reject(new Error('failed to load ' + indexPath + ': ' + err));
      }
      resolve(data);
    });
  })
  .then(function(corpus) {
    return parseCorpus(corpusSpec, indexPath, corpus);
  });
}

function parseCorpus(corpusSpec, indexPath, corpus) {
  return new Promise(function(resolve, reject) {
    var rawJson;
    try {
      rawJson = JSON.parse(corpus);
      rawJson.index = lunr.Index.load(rawJson.index);
      Object.keys(rawJson).forEach(function(key) {
        corpusSpec[key] = rawJson[key];
      });
      resolve();
    } catch (err) {
      reject(new Error('failed to parse ' + indexPath + ': ' + err));
    }
  });
}

function launchServer(lunrServer, reject) {
  lunrServer.httpServer = new http.Server(function(req, res) {
    handleRequest(lunrServer, req, res);
  });

  lunrServer.httpServer.on('error', function(err) {
    reject(err);
  });

  lunrServer.logger.log(
    packageInfo.name + ': listening on port', lunrServer.port);
  lunrServer.httpServer.listen(lunrServer.port);
}

function handleRequest(lunrServer, req, res) {
  var queryParams,
      results = { results: [] },
      response;

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end(http.STATUS_CODES[res.statusCode]);
  }

  queryParams = querystring.parse(url.parse(req.url).query).q;

  Object.keys(lunrServer.corpora).forEach(function(corpus) {
    var corpusSpec = lunrServer.corpora[corpus],
        corpusResults = corpusSpec.index.search(queryParams);

    corpusResults = corpusResults.map(function(result) {
      var urlAndTitle = corpusSpec.url_to_doc[result.ref];
      Object.keys(urlAndTitle).forEach(function(key) {
        result[key] = urlAndTitle[key];
      });
      result.url = corpusSpec.baseurl + result.url;
      delete result.ref;
      return result;
    });

    if (corpusResults.length !== 0) {
      results.results.push({
        corpus: corpusSpec.name,
        baseurl: corpusSpec.baseurl,
        results: corpusResults
      });
    }
  });
  response = JSON.stringify(results);
  console.log('q:', queryParams);
  res.end(response);
}
