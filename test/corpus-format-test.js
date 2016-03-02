'use strict';

var LunrServer = require('../index');
var fs = require('fs');
var http = require('http');
var lunr = require('lunr');
var temp = require('temp');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('Corpus format', function() {
  var lunrServer,
      config,
      indexPath,
      writeIndexAndMakeRequest;

  afterEach(function() {
    return lunrServer.close().then(function() {
      if (!indexPath) {
        return;
      }
      return new Promise(function(resolve, reject) {
        fs.unlink(indexPath, function(err) {
          err ? reject(err) : resolve();
        });
      });
    });
  });

  it('should handle url_to_doc', function() {
    return writeIndexAndMakeRequest(createIndex())
      .then(function(response) {
        response.statusCode.should.eql(200);
      });
  });

  it('should handle urlToDoc', function() {
    var index = createIndex();
    index.urlToDoc = index.url_to_doc;
    delete index.url_to_doc;

    return writeIndexAndMakeRequest(index)
      .then(function(response) {
        response.statusCode.should.eql(200);
      });
  });

  writeIndexAndMakeRequest = function(index) {
    return writeIndex(index)
      .then(function(newIndexPath) {
        indexPath = newIndexPath;
        config = createConfig();
        config.corpora[0].indexPath = indexPath;
        lunrServer = new LunrServer(config, console);
        return lunrServer.launch();
      })
      .then(function() {
        return makeRequest(lunrServer, 'foobar');
      });
  };
});

function createIndex() {
  var index = lunr(function() {
    this.ref('url');
    this.field('url', 10);
    this.field('title', 10);
    this.field('body', 0);
  });

  index.add({
    url: '/foobar/',
    title: 'Foobar',
    body: 'foobar bazquux'
  });

  return {
    index: index.toJSON(),
    url_to_doc: {  // eslint-disable-line camelcase
      '/foobar/': { url: '/foobar/', title: 'Foobar'}
    }
  };
}

function writeIndex(index) {
  return new Promise(function(resolve, reject) {
    temp.open('corpus-format-test-', function(err, info) {
      if (err) {
        return reject(err);
      }
      fs.write(info.fd, JSON.stringify(index));
      fs.close(info.fd, function(err) {
        err ? reject(err) : resolve(info.path);
      });
    });
  });
}

function createConfig() {
  return {
    'corpora': [
      {
        'name': 'Test Index',
        'baseurl': 'https://18f.gsa.gov'
      }
    ],
    'port': 0
  };
}

function makeRequest(lunrServer, query) {
  var options = {
    protocol: 'http:',
    hostname: 'localhost',
    port: lunrServer.httpServer.address().port,
    path: '/?q=' + query,
    method: 'GET'
  };
  return new Promise(function(resolve) {
    http.request(options, function(res) {
      resolve(res);
    }).end();
  });
}
