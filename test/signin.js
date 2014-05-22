var test = require('tap').test;
var request = require('supertest');
var express = require('express');
var user = require('../');
var app = express();
var _ = require('underscore');
var nock = require('nock');
var testdb = nock('http://localhost');
//nock.recorder.rec();

// app.use(express.json());
// app.use(user({ 
//   couch: 'http://localhost:5984/user_test', 
//   users: 'http://localhost:5984/user_test'
// }));

// test('successfully login user', function(t) {
//  // happy Path
//  t.end();
// });

// test('if invalid user and password no request', function(t) {
//   request(app)
//     .post('/api/user/signin')
//     .send({name: "foo", password: "bar"})
//     .set('Accept', 'application/json')
//     .end(function(err, res) {
//       t.equals(_(res).contains('request'), false);
//       t.equals(res.body.message, 'Name or password is incorrect.'); 
//       t.end();
//     });
// });

// test('send error if no user or password', function(t) {
//   request(app)
//     .post('/api/user/signin')
//     .set('Accept', 'application/json')
//     .end(function(err,res) {
//       t.equals(res.statusCode, 401);
//       t.end();
//     });
// });
