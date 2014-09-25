var expect = require('expect.js');
var express = require('express');
var app = express();
var user = require('../');
var userView = require('../lib/user');
var couchUrl = process.env.COUCH || 'http://localhost:5984';
var nano = require('nano')(couchUrl);

var request = require('supertest');

//nock.recorder.rec();

describe('Sign in functions', function() {
  var nock = require('nock');
  var couch = nock(couchUrl);
  var config = {
    users: 'http://localhost:5984/_users',
    adminRoles: ['admin'],
    safeUserFields: 'name email roles desc',
    verify: true
  };

  var userDoc = {
    name: 'foo',
    password: 'password',
    email: 'foo@email.com',
    roles: ['school1'],
    desc: 'foo'
  };

  var sessionCapture = {};

  before(function() {
    app.configure(function() {
      app.use(express.bodyParser());
      app.use(express.cookieParser());
      app.use(express.session({ secret: 'foobar' }));
      app.use(user(config));
      app.use('/setup', function(req, res) {
        req.session.testData = {test: true};
        sessionCapture.before = req.session;
        res.send({});
      });
      app.use('/test', function(req, res) {
        sessionCapture.after = req.session;
        res.send({});
      });
    });
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('POST /api/user/signin', function() {

    it('should authenticate user successfully', function(done) {

      function signIn (cookie) {
        request(app)
          .post('/api/user/signin')
          .set('Cookie', cookie)
          .send({name: 'foo' , password: 'password' })
          .end(function(e, r, b) {
            var obj = JSON.parse(r.text);
            expect(200);
            expect(obj).to.eql({"ok":true,"user":{"name":"foo","roles":["basicUser"]}});
            callTest(r.headers['set-cookie'][0], cookie);
          });
      }

      function callTest (cookie, oldCookie) {
        request(app)
          .get('/test')
          .set('Cookie', cookie)
          .end(function(e, r) {
            expect(cookie).not.to.eql(oldCookie);
            expect(sessionCapture.after.user).to.be.ok();
            done();
          });
      }

      couch
        .post('/_session', "name=foo&password=password")
          .reply(200, {ok: true, name: 'foo'})
        .get('/_users/org.couchdb.user%3Afoo')
          .reply(200, {name: 'foo', roles: ['basicUser'], verified: 'true' });

      request(app) 
        .get('/setup')
        .end(function(e, r) {
          expect(sessionCapture.before.testData.test).to.eql(true);
          signIn(r.headers['set-cookie'][0]);
        });

    });

    it('should fail to authenticate the user', function() {
      request(app)
        .post('/api/user/signin')
        .send({})
        .expect(400)
        .end(function(e,r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.be(false);
          expect(obj.message).to.eql("A name, and password are required.");
        });
    });

    it('should fail to generate a new session', function() {
      couch
        .post('/_session', "name=foo&password=password")
          .reply(500);
      request(app)
        .post('/api/user/signin')
        .send({name: 'foo', password: 'password'})
        .end(function(e,r) {
          expect(r.error).to.be.ok();
        });
    });

    //async problems in this test, it sometimes works as intended
    it('should fail to authenticate a user that does not exist', function(done) {
      couch
        .post('/_session', "name=faker&password=faker")
          .reply(200, {ok: true, name: 'faker'})
        .get('/_users/org.couchdb.user%3Afaker')
          .reply(500);
      request(app)
        .post('/api/user/signin')
        .send({name: 'faker', password: 'faker'})
        .end(function(e,r) {
          expect(r.error).to.be.ok();
          done();
        });
    });

    it('should fail to authenticate an unverified user', function(done) {
      couch
        .post('/_session', "name=foo&password=password")
          .reply(200, {ok: true, name: 'foo'})
        .get('/_users/org.couchdb.user%3Afoo')
          .reply(200, {name: 'foo', roles: ['basicUser'] });
          
      request(app)
        .post('/api/user/signin')
        .send({name: 'foo', password: 'password'})
        .end(function(e,r) {
          expect(r.error).to.be.ok();
          done();
        })    
        
    });

    it('should fail to login a user that is not enabled', function(done) {
      couch
        .post('/_session', "name=foo&password=password")
          .reply(200, {ok: true, name: 'foo'})
        .get('/_users/org.couchdb.user%3Afoo')
          .reply(200, {name: 'foo', roles: ['basicUser'], enabled: false });
          
      request(app)
        .post('/api/user/signin')
        .send({name: 'foo', password: 'password'})
        .end(function(e,r) {
          expect(r.error).to.be.ok();
          done();
        }) 
    });

    it('should login an admin user that has no name returned during authentication', function(done) {
      var cookie = 'AuthSession=1234567890';

      couch
        .post('/_session', "name=foo&password=password")
        .reply(200, {ok: true, name: null}, {'set-cookie': cookie})
        .get('/_session')
        .matchHeader('cookie', cookie)
        .reply(200, {ok: true, userCtx: { name: 'foo'}})
        .get('/_users/org.couchdb.user%3Afoo')
        .reply(200, {name: 'foo', roles: ['basicUser'], verified: 'true' });

      request(app)
        .post('/api/user/signin')
        .send({name: 'foo', password: 'password'})
        .end(function(e, r, b) {
          expect(e).not.to.be.ok();
          expect(200);
          var obj = JSON.parse(r.text);
          expect(obj).to.eql({"ok":true,"user":{"name":"foo","roles":["basicUser"]}});
          done();
        })
    });

  });

});
