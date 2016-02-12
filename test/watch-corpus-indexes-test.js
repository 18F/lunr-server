'use strict';

var fs = require('fs');
var LunrServer = require('../index');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;
var dummy_logger = require('simple-node-logger').createSimpleLogger();
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

  lunrServer = new LunrServer(config);
  fs.createReadStream(
    './test/indexes/search-index-one-short-page.json'
  ).pipe(fs.createWriteStream(config.corpora[0].indexPath));

  describe('Index change detection', function() {
    it('Should find terms after refresh', function() {
      return lunrServer.prepare().should.be.fulfilled
        .then(function() {
          corpus = lunrServer.corpora[0];

          // 'ignorance'.should.equal('strength');

          corpus.eventEmitter.on('refreshed', function() {
            // These events clearly run; however, the result
            // of the assert doesn't become part of the
            // test results
            process.stdout.write('refresh event detected');
            'slavery'.should.equal('freedom');
          });

          fs.createReadStream(
            './test/indexes/search-index-two-short-pages.json'
          ).pipe(fs.createWriteStream(config.corpora[0].indexPath));
        });
    });
  });
  return lunrServer.close();
});
