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
      serverPrep;

  beforeEach(function() {
    lunrServer = new LunrServer(config);
  });

  afterEach(function() {
    return lunrServer.close();
  });

  // process.stdout.write('\n');

  describe('Detect change in index', function() {
    it('should contain correct search results before index is updated',
    function() {
      // Place search index containing only one page in place.
      fs.createReadStream(
        './test/indexes/search-index-one-short-page.json'
      ).pipe(fs.createWriteStream(config.corpora[0].indexPath));
      serverPrep = lunrServer.prepare().then(function() {
        var searchIndex = lunrServer.corpora[0].index;
        it('should not find search terms that are not present anywhere',
        function() {
          var searchResults = searchIndex.search('wildebeests');
          searchResults.length.should.equal(0);
        });
        it('should find index page when searching for word in it',
        function() {
          var searchResults = searchIndex.search('update_theme');
          searchResults.length.should.equal(1);
          searchResults[0].ref.should.equal('/');
        });
        it('should not find child page when index not yet updated',
        function() {
          var searchResults = searchIndex.search('webhook');
          searchResults.length.should.equal(0);
        });
        // change the search index - represents rebuilding corpus
        fs.createReadStream(
          './test/indexes/search-index-two-short-pages.json'
        ).pipe(fs.createWriteStream(config.corpora[0].indexPath));
        it('should find child page once it is indexed',
        function() {
          var searchResults = searchIndex.search('webhook');
          searchResults.length.should.equal(1);
          searchResults[0].ref.should.equal('/');
        });
      });
      return serverPrep.should.be.fulfilled;
    });
  });
});
