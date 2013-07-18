// var expect = require('expect.js');
// var express = require('express');
// var app = express();
// var user = require('../');
// var userView = require('../lib/user');
// var couchUrl = process.env.COUCH || 'http://localhost:5984';
// var nano = require('nano')(couchUrl);
// 
// var request = require('request');
// var db = nano.use('_users');
// app.use(express.bodyParser());
// app.use(express.cookieParser());
// app.use(express.session({ secret: 'foobar'}));
// app.use(user({ couch: couchUrl + '/_users'}));
// 
// describe('POST /api/user/signin', function() {
//   var user;
//   var server;
//   before(function(done) {
//     server = app.listen(4000, done);
//   });
//   after(function() {
//     server.close();
//   });
//   before(function(done) {
//     db.insert({
//       name: 'dummy',
//       password: 'dummy',
//       type: 'user',
//       roles: []
//     }, 'org.couchdb.user:dummy', function(e,b) {
//       user = b;
//       done();
//     });
//   });
//   it('should authenticate user successfully', function(done){
//     request.post('http://localhost:4000/api/user/signin', {
//       json: {
//         name: 'dummy',
//         password: 'dummy'
//       }
//     }, function(e,r,b) {
//       expect(b.ok).to.be.ok();
//       done();
//     });
//   });
// });