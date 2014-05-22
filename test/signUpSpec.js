var expect = require('expect.js');
var express = require('express');
var app = express();
var user = require('../');
var userView = require('../lib/user');
var couchUrl = process.env.COUCH || 'http://localhost:5984';
var nano = require('nano')(couchUrl);
var nock = require('nock');
var request = require('supertest');

//nock.recorder.rec();

describe('User sign up', function() {

  var couch = nock(couchUrl);

  var config = {
    users: 'http://localhost:5984/_users',
    adminRoles: ['admin'],
    safeUserFields: 'name email roles desc'
  };

  var userDoc = {
    name: 'foo',
    password: 'password',
    roles: ['school1'],
    desc: 'foo'
  };

  beforeEach(function() {
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

  describe('POST: /api/user/signup', function() {

    it('should sign a new user up successfully without verificiation email', function(done) {
      couch
        .put('/_users/org.couchdb.user%3AfooBar', {"name":"fooBar","password":"fooBarpw","email":"foo@bar.com","roles":["user1"],"type":"user"})
          .reply(200, {ok: true, rev: '123'})
      request(app)
        .post('/api/user/signup')
        .send({name: 'fooBar', password: 'fooBarpw', confirm_password: 'fooBarpw', email: 'foo@bar.com', roles: ['user1']})
        .end(function(e,r) {
          var obj = JSON.parse(r.text);
          expect(e).not.to.be.ok();
          expect(obj._rev).to.eql('123');
          done();
        })
    });

    it('should fail to sign a user up due to missing an email' , function() {
      request(app)
        .post('/api/user/signup')
        .send({name: 'fooBar', password: 'fooBarpw', roles: ['user1']})
        .end(function(e,r) {
          var obj = JSON.parse(r.text)
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql("A name, password, and email address are required.");
        })
    });

  });
  
});