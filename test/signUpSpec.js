var expect = require('expect.js');
var express = require('express');
var app = express();
var user = require('../');
var userView = require('../lib/user');
var couchUrl = process.env.COUCH || 'http://localhost:5984';
var nano = require('nano')(couchUrl);
var _ = require('underscore');

var request = require('supertest');

//nock.recorder.rec();

describe('User sign up', function() {
  var nock = require('nock');

//  TODO: We cannot safely disable network connections from one test without affecting the others.  File a separate bug and make it possible to run without touching couch at all.
//  nock.disableNetConnect();
//  nock.enableNetConnect("(localhost|127.0.0.1):(?!5984).*");

  var couch = nock(couchUrl);

  var config = {
    users: 'http://admin:admin@localhost:5984/_users',
    adminRoles: ['admin'],
    safeUserFields: 'name email roles desc'
  };

  var userDoc = {
    name:     'foo',
    email:    'foo@localhost',
    password: 'password',
    roles:    ['school1'],
    desc:     'foo'
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

    it('should sign a new user up successfully without verification email', function(done) {
      // Needed to confirm that the user doesn't already exist
      couch
        .get('/_users/org.couchdb.user%3AfooBar')
        .reply(200, JSON.stringify({ "error": "not_found", "reason": "missing"}));
      // Needed to confirm that no other users with the same email already exist
      couch
        .get('/_users/_design/user/_view/all?key=%22foo%40bar.com%22')
        .reply(200, JSON.stringify({ "error": "not_found", "reason": "missing"}));
      // Needed for the actual user creation
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
        // Needed to confirm that the user doesn't already exist
        couch
            .get('/_users/org.couchdb.user%3AfooBar')
            .reply(200, JSON.stringify({ "error": "not_found", "reason": "missing"}));
        // Needed to confirm that no other users with the same email already exist
        couch
            .get('/_users/_design/user/_view/all?key=%22foo%40bar.com%22')
            .reply(200, JSON.stringify({ "error": "not_found", "reason": "missing"}));
        request(app)
        .post('/api/user/signup')
        .send({name: 'fooBar', password: 'fooBarpw', roles: ['user1']})
        .end(function(e,r) {
          var obj = JSON.parse(r.text)
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql("A name, password, and email address are required.");
        })
    });

    it('should fail to sign a user whose email matches an existing user' , function() {
      // Needed to confirm that the user doesn't already exist
      couch
          .get('/_users/org.couchdb.user%3AfooBar')
          .reply(404, JSON.stringify({ "error": "not_found", "reason": "missing"}));

      // Simulate finding an existing user with the same email address
      var emailUserFound = {
          "total_rows": 9,
          "offset": 1,
          "rows": [ _.extend(_.clone(userDoc), { _id: 'org.couchdb.user:fooBar', _rev: '1-234' })]
      };
      couch
          .get('/_users/_design/user/_view/all?key=%22foo%40bar.com%22')
          .reply(200, JSON.stringify(emailUserFound));

      request(app)
          .post('/api/user/signup')
          .send({name: 'fooBar', password: 'fooBarpw', roles: ['user1'], email: "foo@bar.com"})
          .end(function(e,r) {
              var obj = JSON.parse(r.text)
              expect(obj.ok).to.eql(false);
              expect(obj.message).to.eql("A user with this email address already exists.  Try resetting your password instead.");
          })
    });
  });
});