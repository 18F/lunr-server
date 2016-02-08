# lunr-server [WORK IN PROGRESS]

This is a Node.js server that responds to queries for Lunr.js indexes.

**Note: This server is still in its early stages and subject to change
drastically. Don't use it yet.**

## Running locally

Assumes that the indexed projects are locally accessible
via the filepaths listed in `lunr-server-config.json`.

### Install

    sudo npm install gulp gulp-util gulp-mocha --save-dev

### Run

    bin/lunr-server lunr-server-config.json

### Query

    curl localhost:8080/?q=my+search+terms
