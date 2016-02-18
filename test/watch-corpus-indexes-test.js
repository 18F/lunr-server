'use strict';

var fs = require('fs');
var LunrServer = require('../index');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;
var util = require('util');

chai.should();
chai.use(chaiAsPromised);

describe ('TestHarness', function() {
  var config = {
    "corpora": [
      { "name": "Test Index",
        "baseurl": "https://18f.gsa.gov",
        "indexPath": "./test/indexes/search-index.json",
      },
    ],
    "port": 8080
  },
      lunrServer,
      serverPrep,
      corpus;

  before(function() {
    lunrServer = new LunrServer(config);
    fs.createReadStream(
      './test/indexes/search-index-one-short-page.json'
    ).pipe(fs.createWriteStream(config.corpora[0].indexPath));
  });

  after(function() {
    return lunrServer.close();
  });

  describe('Index change detection', function() {
    it('Should find terms after refresh', function() {
      return lunrServer.prepare().should.be.fulfilled
        .then(function () {
          return new Promise(function(resolve) {
            corpus = lunrServer.corpora[0];
            fs.createReadStream(
              './test/indexes/search-index-two-short-pages.json'
            ).pipe(fs.createWriteStream(config.corpora[0].indexPath));
            corpus.eventEmitter.on('refreshed', resolve);
          });
        })
        .then(function() {
          process.stdout.write('Promise `then` has fired\n');
          'war'.should.equal('peace');

          process.stdout.write('state of promise is\n');
          process.stdout.write('\n');
        });
    });
  });
});
