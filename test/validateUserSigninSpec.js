var expect = require('expect.js');
var express = require('express');
var nock = require('nock');
var request = require('supertest');

describe('login with validateUser test', function() {

  var user = require('../');
  var userView = require('../lib/user');
  var couchUrl = 'http://localhost:5984';

  var config = { 
    couch: couchUrl + '/_user', 
    users: couchUrl + '/_user',
    validateUser: function(data, cb) {
      var user = data.user;
      if(user.failedLogin > 5) {
        var errorPayload = {
          statusCode: 403,
          message: 'Exceeded fail login attempts', 
          error: 'Forbidden'
        };
        cb(errorPayload);
      } else {
        cb(null);
      }
    }
  };

  var app;

  before(function() {
    app = express();
    app.configure(function() {
      app.use(express.bodyParser());
      app.use(express.cookieParser());
      app.use(express.session({ secret: 'foobar'}));
      app.use(user(config)); 
    });
  });

  afterEach(function() {
    nock.cleanAll();
  });

    
  it('should return a status code of 403', function(done) {
    var authResponse = {
      name: 'foo',
      ok: true
    };

    nock('http://localhost:5984')
      .post('/_session', "name=foo&password=foo") 
      .reply(200, JSON.stringify(authResponse));

    var getResponse = {
      name: 'foo',
      failedLogin: 6
    };

    nock('http://localhost:5984')
      .get('/_user/org.couchdb.user%3Afoo')
      .reply(200, JSON.stringify(getResponse));

    var expectedResult = {
      ok: false,
      message: 'Exceeded fail login attempts', 
      error: 'Forbidden' 
    };

    request(app)
      .post('/api/user/signin')
      .send({ name: 'foo', password: 'foo' }) 
      .expect(403, expectedResult, done);
  });

  it('should return a status code of 200', function(done) {
    var authResponse = {
      name: 'foo',
      ok: true
    };

    nock('http://localhost:5984')
      .post('/_session', "name=foo&password=foo") 
      .reply(200, JSON.stringify(authResponse));

    var getResponse = {
      name: 'foo',
      failedLogin: 4
    };

    nock('http://localhost:5984')
      .get('/_user/org.couchdb.user%3Afoo')
      .reply(200, JSON.stringify(getResponse));

    var expectedResult = {
      ok: true
    };

    request(app)
      .post('/api/user/signin')
      .send({ name: 'foo', password: 'foo' }) 
      .expect(200) //, expectedResult, done);
      .end(function(err, res) {
        expect(res.text).to.eql(JSON.stringify({ok: true, user: { name: 'foo' } }));
        done();
      });
  });
});
