'use strict';

var LunrServer = require('../index');
var fs = require('fs');
var path = require('path');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe ('Watch corpus indexes', function() {
  var config = {
        'corpora': [
      { 'name': 'Test Index',
        'baseurl': 'https://18f.gsa.gov',
        'indexPath': path.join('./test/indexes/search-index.json')
      }
        ],
        'port': 0
      },
      lunrServer,
      corpus;

  before(function() {
    lunrServer = new LunrServer(config);
    fs.createReadStream(
      path.join('./test/indexes/search-index-one-short-page.json')
    ).pipe(fs.createWriteStream(config.corpora[0].indexPath));
  });

  after(function() {
    return lunrServer.close();
  });

  describe('Index change detection', function() {
    it('Search terms should change when index updated', function() {
      return lunrServer.prepare().should.be.fulfilled
        .then(function () {
          return new Promise(function(resolve) {
            corpus = lunrServer.corpora[0];

            // Search term 'layout' is included in 1-page insdex
            var searchResults = corpus.index.search(['layout']);
            searchResults.length.should.equal(1);
            searchResults[0].ref.should.equal('/');
            // but term 'chapter' is not there
            searchResults = corpus.index.search(['chapter']);
            searchResults.length.should.equal(0);

            // Now add page 2 to the index
            fs.createReadStream(
              path.join('./test/indexes/search-index-two-short-pages.json')
            ).pipe(fs.createWriteStream(config.corpora[0].indexPath));

            // This promise will be fulfilled only when
            // the corpus sees its index has been changed
            corpus.eventEmitter.on('refreshed', resolve);
          });
        })
        .then(function() {
          // Now that the index has been updated with page 2,
          // the term 'chapter' should give search results
          var searchResults = corpus.index.search(['chapter']);
          searchResults.length.should.equal(1);
          searchResults[0].ref.should.equal('/post-your-guide/');
        });
    });
  });
});
