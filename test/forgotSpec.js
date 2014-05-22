// Having issues with testing the forgot password calls due to the UUID that gets generated.
// Leaving this code here for future reference

// var expect = require('expect.js');
// var express = require('express');
// var app = express();
// var user = require('../');
// var userView = require('../lib/user');
// var couchUrl = process.env.COUCH || 'http://localhost:5984';
// var nano = require('nano')(couchUrl);
// var nock = require('nock');
// var request = require('supertest');

// nock.recorder.rec();

// describe('Forgot User Password', function() {

//   var couch = nock(couchUrl);

//   var config = {
//     users: 'http://localhost:5984/_users',
//     adminRoles: ['admin'],
//     safeUserFields: 'name email roles desc'
//   };

//   var userDoc = {
//     name: 'foo',
//     password: 'password',
//     roles: ['school1'],
//     desc: 'fooBars',
//     email: 'foo@bar.com'
//   };

//   beforeEach(function() {
//     app.configure(function() {
//       app.use(express.bodyParser());
//       app.use(express.cookieParser());
//       app.use(express.session({ secret: 'foobar'}));
//       app.use(user(config));
//     });
//   });

//   afterEach(function() {
//     nock.cleanAll();
//   });

//   describe('POST: /api/user/forgot', function() {
//       // need to insert user to retrieve email for 
//     beforeEach(function() {

//     })

//     it.only('should send a forgot password email successfully', function() {
//       couch
//         .get('/_users/_design/user/_view/all?key=%22foo%40bar.com%22')
//           .reply(200, {rows: [{value: userDoc}]})
//         .post('_users')
//           .reply(200)
//       request(app)
//         .post('/api/user/forgot')
//         .send({email: 'foo@bar.com'})
//         .end(function(e,r) {
//           console.log("r:", r);
//           // var obj = JSON.parse(r.text);
//           // console.log("obj:", obj);
//         })
//     });

//   });

// });