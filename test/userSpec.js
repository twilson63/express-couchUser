var expect = require('expect.js');
var express = require('express');
var app = express();
var user = require('../');
var userView = require('../lib/user');
var couchUrl = process.env.COUCH || 'http://localhost:5984';
var nano = require('nano')(couchUrl);

var request = require('request');
var cookieJar = request.jar();

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'foobar'}));
app.use(user({ couch: couchUrl + '/user_test', users: couchUrl + '/user_test'}));

var userDoc = {
  name: 'user',
  password: 'password',
  email: 'user@email.com',
  roles: ['school1']
};

var adminUser = {
    "name": "admin",
    "password" : "admin",
    "roles": [ "admin" ]
};

describe('User API Tests', function() {
  var db;
  var server;
  before(function(done) {
    server = app.listen(3000, done);
  });
  after(function() {
    server.close();
  });

  before(function(done) {
    nano.db.create('user_test', setupDb);
    function setupDb() {
      db = nano.use('user_test');
      db.insert(userView, '_design/user', done);
    }
  });

// We have to be logged in as an admin user to execute CRUD calls, so we need to create one.
   before(function(done) {
          db.insert(adminUser, 'org.couchdb.user:' + adminUser.name, done);
   });

    // We have to be logged in as an admin user to execute CRUD calls, so we need to log in and keep passing those credentials
   before(function(done) {
       request.post('http://localhost:3000/api/user/signin', {
           json: {
                name: adminUser.name,
                password: adminUser.password
           },
           jar: cookieJar
       }, function(e,r,b) {
           expect(e).to.be(null);
           console.log(JSON.stringify(b),null,"\t");
           expect(r.statusCode).to.be(200);
           expect(b.user).not.to.be(undefined);
           expect(cookieJar.cookies.filter(function(element) { return element.name === "AuthSession"})).not.to.be(undefined);
           done();
       });
    });

  after(function(done) {
    nano.db.destroy('user_test', done);
  });

//
//    describe('POST /api/user', function() {
//        var user;
//        it('should create new user document', function(done) {
//            request.post('http://localhost:3000/api/user', {json: userDoc}, function(e,r,b) {
//                user = b;
//                expect(b.ok).to.be.ok();
//                done();
//            });
//        });
//    });
//    describe('GET /api/user', function() {
//    var user2;
//    before(function(done) {
//      var doc = {
//        name: 'user2',
//        password: 'password',
//        email: 'user@email.com',
//        roles: ['school1']
//      };
//      db.insert(doc, function(err, body) {
//        user2 = body;
//        done();
//      });
//    });
//    it('should list all users for a given role(s)', function(done) {
//      request.get('http://localhost:3000/api/user',
//        { json:true, qs: {roles: 'school1'}},
//        function(e,r,b) {
//          expect(b).to.not.be.empty();
//          done();
//        });
//    });
//  });
//    describe('GET /api/user/:name', function() {
//    it('should return user doc', function(done) {
//      request.get('http://localhost:3000/api/user/' + adminUser.name,
//        { jar: cookieJar},
//        function(e,r,b) {
//            expect(e).to.be(undefined);
//            expect(r).to.be(undefined);
//            expect(b).to.be.an('object');
//          done();
//        });
//    });
//  });

//    describe('PUT /api/user/:name', function() {
//    var user4;
//    before(function(done) {
//      var doc = {
//        name: 'user4',
//        password: 'password',
//        email: 'user@email.com',
//        roles: ['school1']
//      };
//      db.insert(doc, 'org.couchdb.user:' + doc.name, function(err, body) {
//        user4 = doc;
//        user4._id = body.id;
//        user4._rev = body.rev;
//        done();
//      });
//    });
//    it('should return user doc', function(done) {
//      user4.password = 'foo';
//      request.put('http://localhost:3000/api/user/' + 'user4',
//        {json: user4},
//        function(e,r,b) {
//          expect(b.ok).to.be.ok();
//          expect(b.rev.split('-')[0]).to.be('2');
//          done();
//        });
//    });
//  });
//  describe('DELETE /api/user/:name', function() {
//    var user5;
//    before(function(done) {
//      var doc = {
//        name: 'user5',
//        password: 'password',
//        email: 'user@email.com',
//        roles: ['school1']
//      };
//      db.insert(doc, 'org.couchdb.user:' + doc.name, function(err, body) {
//        debugger;
//        user5 = doc;
//        user5._id = body.id;
//        user5._rev = body.rev;
//        done();
//      });
//    });
//    it('should return user doc', function(done) {
//      debugger;
//      request.del('http://localhost:3000/api/user/' + 'user5',
//        {json: user5},
//        function(e,r,b) {
//          debugger;
//          expect(b.ok).to.be.ok();
//          done();
//        });
//    });
//  });

});