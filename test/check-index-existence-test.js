'use strict';

var LunrServer = require('../index');
var lunr = require('lunr');
var fs = require('fs');
var temp = require('temp');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;

chai.should();
chai.use(chaiAsPromised);

describe ('Check index existence', function() {
  var indexPath,
      config,
      lunrServer;

  indexPath = temp.path();
  config = {
    'corpora': [
      {
        'name': 'Test Index',
        'baseurl': 'https://18f.gsa.gov',
        'indexPath': indexPath
      }
    ],
    'port': 8080
  };

  it('should not crash when the index doesn\'t exist', function() {
    lunrServer = new LunrServer(config, console);
    return lunrServer.prepare().then(function() {
      expect(lunrServer.corpora[0].index).to.be.undefined;
    });
  });

  it('should not crash when the index goes away', function() {
    return writeIndex(createIndex(), indexPath)
      .then(function() {
        lunrServer = new LunrServer(config, console);
        return lunrServer.prepare();
      })  
      .then(function() {
        expect(lunrServer.corpora[0].index).to.not.be.undefined;
        return removeFile(indexPath);
      })
      .then(function() {
        return lunrServer.close();
      })
      .then(function() {
        expect(lunrServer.corpora[0].index).to.not.be.undefined;
      });
  });
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

function writeIndex(index, indexPath) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(indexPath, JSON.stringify(index), 'utf8', function(err) {
      err ? reject(err) : resolve();
    });
  });
}

function removeFile(filePath) {
  return new Promise(function(resolve, reject) {
    fs.unlink(filePath, function(err) {
      err ? reject(err) : resolve();
    });
  });
}
