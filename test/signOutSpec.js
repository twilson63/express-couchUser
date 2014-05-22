var expect = require('expect.js');
var express = require('express');
var app = express();
var user = require('../');
var userView = require('../lib/user');
var couchUrl = process.env.COUCH || 'http://localhost:5984';
var nano = require('nano')(couchUrl);
var request = require('supertest');

//nock.recorder.rec();

describe('User sign out', function() {
  var config = {
    users: 'http://localhost:5984/_users',
    adminRoles: ['admin'],
    safeUserFields: 'name email roles desc',
    verify: true
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

  describe('POST /api/user/signout', function() {
    it('should log out a user successfully', function(done) {
      function signOut (cookieToPass) {
        request(app)
          .post('/api/user/signout')
          .set('Cookie', cookieToPass)
          .end(function(e,r) {
            parsedResText = JSON.parse(r.text);
            expect(parsedResText).to.be.ok();
            callTest()
          })
      }

      function callTest (cookie) {
        request(app) 
          .get('/test')
          .end(function(e,r) {
            expect(sessionCapture.before).not.to.eql(sessionCapture.after);
            done();
          })
      }

      request(app)
        .get('/setup')
        .end(function(e,r) {
          expect(sessionCapture.before.testData.test).to.eql(true);
          signOut(r.headers['set-cookie'][0]);
        });
    });
  });

});