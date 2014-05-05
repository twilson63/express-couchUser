This directory contains tests that are designed to be run using mocha.

To run these tests:
* Install mocha using a command like: `npm -g install mocha`
* Navigate to the parent directory.
* Start mocha using a command like: `mocha`
* added grunt task to run mocha test - run 'grunt watch' and this task will watch the test directory and run mocha whenever a file changes.
* Use nock to mock couch calls and supertest to mock request calls to the api. Look at userSpec.js for pattern

