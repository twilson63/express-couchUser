var expect = require('expect.js');
var express = require('express');
var nock = require('nock');
var request = require('supertest');
var _ = require('underscore');

//nock.recorder.rec();

describe('User API Tests', function() {
  var user = require('../');
  var userView = require('../lib/user');
  var couch_url = 'http://localhost:5984';
  var couch = nock(couch_url);
  var config = {
    users: 'http://localhost:5984/_users',
    adminRoles: ['admin'],
    safeUserFields: 'name email roles desc' 
  };

  var userDoc = {
    name: 'foo',
    password: 'password',
    email: 'foo@email.com',
    roles: ['school1'],
    desc: 'foo'
  };

  var adminUser = {
    "name": "adminUser",
    "password" : "admin",
    "roles": [ "admin" ]
  };

  var captureSession = {};

  var app;
  before(function() {
    app = express();
    app.configure(function() {
      app.use(express.bodyParser());
      app.use(express.cookieParser());
      app.use(express.session({ secret: 'foobar'}));
      app.use(function(req, res, next) {
        //for mocking admin/user login
        if(req.header('isAdmin') === 'true') {
          req.session.regenerate(function() {
            req.session.user = adminUser;
            next();
          });
        } else if(req.header('isAdmin') === 'false') {
          req.session.regenerate(function() {
            req.session.user = userDoc;
            next();
          });
        } else {
          next();
        }
      });
      app.use('/captureSessionBefore', function(req, res) {
        captureSession.before = req.session.user;
        res.send(200); 
      });
      app.use('/captureSessionAfter', function(req, res) {
        captureSession.after = req.session.user;
        res.send(200);
      });
      app.use(user(config));
    });
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('POST /api/user', function() {
    var user;
    it('should respond with 401 if user is not logged in', function(done) {
      request(app)
        .post('/api/user')
        .send({ name: 'foo' })
        .expect(401)
        .end(function(e, r, b) {
          var obj = JSON.parse(r.text); 
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql('You must be logged in to use this function');
          done();
        });
    });
    it('should respond with a 403 if user doesnt have admin role', function(done) {
      //sign in as not an admin 
      request(app)
        .post('/api/user')
        .set('isAdmin', 'false') //mocking a logged in user that doesn't have admin rights
        .send({ })
        .expect(403)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql("You do not have permission to use this function.");
          done();
        }); 
    });
    it('should respond 200 if logged in as an admin', function(done) {
      //sign in as admin
      var addUser = {
        'name': 'foo',
        'password': 'foo',
        'roles': []
      };

      couch 
        .put('/_users/org.couchdb.user%3Afoo', {"name":"foo","password":"foo","roles":[],"type":"user"})
        .reply(201, "{\"ok\":true,\"id\":\"org.couchdb.user:foo\",\"rev\":\"1-d7bf8c9ff7e0060c7d3457536afccf97\"}\n");

      request(app)
        .post('/api/user')
        .set('isAdmin', 'true') //mocking logged in user that is admin role
        .send(addUser)
        .expect(200)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(true);
          expect(obj.data.id).to.eql('org.couchdb.user:foo');
          done();
        }); 
    });
  });
  describe('GET /api/user', function() {
    it('should return a 401 for not being logged in', function(done) {
      request(app)
        .get('/api/user')
        .send({ name: 'foo' })
        .expect(401)
        .end(function(e, r, b) {
          var obj = JSON.parse(r.text); 
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql('You must be logged in to use this function');
          done();
        });
    });
    it('should return a 400 when query has no roles', function(done) {
      request(app)
        .get('/api/user')
        .set('isAdmin', 'false') //mocking a logged in user that doesn't have admin rights
        .send({ })
        .expect(403)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql('Roles are required!');
          done();
        }); 
    });
    it('should return a 200 for getting users by roles', function(done) {
      var mockCouchReply = {
        rows: [
          { value: { name: 'student1' } },
          { value: { name: 'student2' } }
        ]
      }
      couch
        .post('/_users/_design/user/_view/role', { "keys":["student"] })
        .reply(200, JSON.stringify(mockCouchReply));

      request(app)
        .get('/api/user?roles=student')
        .set('isAdmin', 'false')
        .expect(200)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(true);
          expect(obj.users).to.eql([{ name: 'student1' }, { name: 'student2' }]);
          done();
        });
    });
  });
  describe('GET /api/user/:name', function() {
    it('should return a 401 for not being logged in', function(done) {
      request(app)
        .get('/api/user')
        .send({ name: 'foo' })
        .expect(401)
        .end(function(e, r, b) {
          var obj = JSON.parse(r.text); 
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql('You must be logged in to use this function');
          done();
        });
    });
    it('should return a user doc', function(done) {
      var userFoo = {
        name: 'foo'
      };
      couch
        .get('/_users/org.couchdb.user%3Afoo')
        .reply(200, userFoo);

      request(app)
        .get('/api/user/foo')
        .set('isAdmin', 'false')
        .expect(200)
        .end(function(e, r, b) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(true);
          expect(obj.user.name).to.eql('foo');
          done();
        });
    });
  });

  describe('PUT /api/user/:name', function() {
    it('should return a 401', function(done) {
      request(app)
        .put('/api/user/foo')
        .send({ name: 'foo' })
        .expect(401)
        .end(function(e, r) {
          var obj = JSON.parse(r.text); 
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql('You must be logged in to use this function');
          done();
        });
    }) 
    it('should return a 403', function(done) {
      request(app)
        .put('/api/user/bar')
        .send({ name: 'foo' , desc: 'fooey' })
        .set('isAdmin', 'false') 
        .expect(403)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql('You do not have permission to use this function.');
          done();
        });
    });  
    it('should return 200 for admin role editing another user', function(done) {
      var mockGet = _.clone(userDoc);
      mockGet = _.extend(mockGet, { _id: 'org.couchdb.user:foo', _rev: '1-234' }); 
      
      var mockPut = {
        name: 'foo',
        password: 'password',
        email: 'foo@email.com',
        roles: ['Admin'],
        desc: 'fooey',
        _id: 'org.couchdb.user:foo',
        _rev: '1-234'
      };
      couch
        .get('/_users/org.couchdb.user%3Afoo')
          .reply(200, JSON.stringify(mockGet))
        .put('/_users/org.couchdb.user%3Afoo', JSON.stringify(mockPut))
          .reply(200, JSON.stringify({ ok: true, id: 'org.couchdb.user:foo', rev: '2-234' }));

      request(app)
        .put('/api/user/foo')
        .send({ name: 'foo', desc: 'fooey', roles: ['Admin'] })
        .set('isAdmin', 'true')
        .expect(200)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(true);
          expect(obj.user.roles).to.eql(['Admin']);
          expect(obj.user.desc).to.eql('fooey');
          done();
        });   
    });
    it('should return 200 for user editing his own user doc, but should not update roles array', function(done) {
      var mockGet = _.clone(userDoc);
      mockGet = _.extend(mockGet, { 
        _id: 'org.couchdb.user:foo', 
        _rev: '1-234', 
        salt: 'salt',
        password_sha: 'sha',
        derived_key: 'dk'
      });

      var mockPut = {
        name: 'foo',
        password: 'password',
        email: 'foo@email.com',
        roles: ['school1'],
        desc: 'fooey',
        _id: 'org.couchdb.user:foo',
        _rev: '1-234',
        salt: 'salt',
        password_sha: 'sha',
        derived_key: 'dk'
      };
      couch
        .get('/_users/org.couchdb.user%3Afoo')
          .reply(200, JSON.stringify(mockGet))
        .put('/_users/org.couchdb.user%3Afoo', JSON.stringify(mockPut))
          .reply(200, JSON.stringify({ ok: true, id: 'org.couchdb.user:foo', rev: '2-234' }));

      function callUpdate(cookie) {
        request(app)
          .put('/api/user/foo')
          .set('Cookie', cookie)
          .send({ name: 'foo', desc: 'fooey', roles: ['Admin', 'school1'] })
          .expect(200)
          .end(function(e, r) {
            var obj = JSON.parse(r.text);
            expect(obj.ok).to.eql(true);
            expect(obj.user.desc).to.eql('fooey');
            expect(obj.user.roles).to.eql(['school1']);
            expect(obj.user.salt).to.not.be.ok();
            expect(obj.user.password_sha).to.not.be.ok();
            expect(obj.derived_key).to.not.be.ok();
            callSessionAfter(cookie); 
          });
      }

      function callSessionAfter(cookie) {
        //makes sure session got updated
        request(app)
          .get('/captureSessionAfter')
          .set('Cookie', cookie)
          .expect(200)
          .end(function(e, r) {
            expect(captureSession.after.desc).to.eql('fooey');
            expect(captureSession.before.desc).not.to.eql(captureSession.after.desc);
            expect(captureSession.after.salt).to.not.be.ok();
            expect(captureSession.after.password_sha).to.not.be.ok();
            expect(captureSession.after.derived_key).to.not.be.ok();
            done();
          });
      }

      request(app)
        .get('/captureSessionBefore')
        .set('isAdmin', false)
        .expect(200)
        .end(function(e, r) {
          callUpdate(r.headers['set-cookie'][0]);
        });
    });
  });

  describe('DELETE /api/user/:name', function() {
    it('should return a 401', function(done) {
      request(app)
        .del('/api/user/foo')
        .expect(401)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql("You must be logged in to use this function");
          done();
        });
    }); 
    it('should return a 403', function(done) {
      request(app)
        .del('/api/user/foo')
        .set('isAdmin', 'false')
        .expect(403)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(false);
          expect(obj.message).to.eql("You do not have permission to use this function.");
          done();
        });
    });
    it('should return a 200', function(done) {
      var mockReply = _.extend(_.clone(userDoc), { _id: 'org.couchdb.user:adminFoo', _rev: '1-234' });

      nock('http://localhost:5984:5984')
        .get('/_users/org.couchdb.user%3Afoo')
          .reply(200, JSON.stringify(mockReply))
        .delete('/_users/org.couchdb.user%3AadminFoo?rev=1-234')
          .reply(200, {msg: 'delete success'});


      request(app)
        .del('/api/user/foo')
        .set('isAdmin', 'true')
        .expect(200)
        .end(function(e, r) {
          var obj = JSON.parse(r.text);
          expect(obj.ok).to.eql(true);
          expect(obj.message).to.eql('User foo deleted.');
          done();
        });    

    });
    it('should return a 200 and log out adminUser when deleting self', function(done) {
      var mockReply = _.extend(_.clone(adminUser), { _id: 'org.couchdb.user:adminUser', _rev: '1-234' });
      couch
        .get('/_users/org.couchdb.user%3AadminUser')
          .reply(200, JSON.stringify(mockReply))
        .delete('/_users/org.couchdb.user%3AadminUser?rev=1-234')
          .reply(200, { ok: true, msg: 'del success' });

      function makeDeleteCall(cookie) {
        request(app)
          .del('/api/user/adminUser')
          .set('Cookie', cookie)
          .expect(200)
          .end(function(e, r) {
            var obj = JSON.parse(r.text);
            expect(obj.ok).to.eql(true);
            expect(obj.message).to.eql('User adminUser deleted.');
            expect(r.headers['set-cookie']).to.not.be.ok();
            callSessionAfter(cookie);
          });
      }

      function callSessionAfter(cookie) {
        request(app)
          .get('/captureSessionAfter')
          .set('Cookie', cookie)
          .expect(200)
          .end(function(e, r) {
            expect(captureSession.before).to.not.eql(captureSession.after);
            expect(captureSession.after).to.not.be.ok();
            done();
          });
      }

      request(app)
        .get('/captureSessionBefore')
        .set('isAdmin', 'true')
        .expect(200)
        .end(function(e, r) {
          makeDeleteCall(r.headers['set-cookie'][0]);
        });

    });
  });
});
