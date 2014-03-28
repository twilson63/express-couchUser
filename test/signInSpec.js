var expect = require('expect.js');
var express = require('express');
var app = express();
var user = require('../');
var userView = require('../lib/user');
var couchUrl = process.env.COUCH || 'http://localhost:5984';
var nano = require('nano')(couchUrl);

var request = require('request');
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'foobar'}));
app.use(user({ couch: couchUrl + '/user_test', users: couchUrl + '/user_test'}));

var cookieJar = request.jar();

describe('Login, logout, and current user functions.', function() {
    var db;
    var user;
    var server;
    before(function(done) {
        server = app.listen(4000, done);
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
    after(function(done) {
        nano.db.destroy('user_test', done);
    });

    before(function(done) {
        db.insert({
            name: 'dummy',
            password: 'dummy',
            type: 'user',
            roles: []
        }, 'org.couchdb.user:dummy', function(e,b) {
            user = b;
            done();
        });
    });

    describe('POST /api/user/signin', function() {
        it('should authenticate user successfully', function(done){
            request.post('http://localhost:4000/api/user/signin', {
                json: {
                    name: 'dummy',
                    password: 'dummy'
                },
                jar: cookieJar
            }, function(e,r,b) {
                expect(r.statusCode).to.be(200);
                expect(b.user).not.to.be(undefined);
                expect(cookieJar.cookies.filter(function(element) { return element.name === "AuthSession"})).not.to.be(undefined);
                done();
            });
        });
    });

    describe('POST /api/user/signout', function() {
        it('should log out successfully', function(done){
            request.post('http://localhost:4000/api/user/signin', {
                json: {
                    name: 'dummy',
                    password: 'dummy'
                },
                jar: cookieJar
            }, function(e,r,b) {
                expect(r.statusCode).to.be(200);
                expect(b.user).not.to.be(undefined);
                expect(cookieJar.cookies.filter(function(element) { return element.name === "AuthSession"})).not.to.be(undefined);
                done();
            });
        });
    });

    describe('GET /api/user/current (when logged in)', function() {
        it('should confirm user is logged in', function(done){
            request.get('http://localhost:4000/api/user/current', {jar: cookieJar}, function(e,r,b) {
                expect(r.statusCode).to.be(200);
                expect(JSON.parse(b).user).not.to.be(undefined);
                done();
            });
        });
    });

    describe('GET /api/user/current (when not logged in)', function() {
        it('should return a sensible error', function(done){
            request.get('http://localhost:4000/api/user/current', {jar: false}, function(e,r,b) {
                expect(r.statusCode).not.to.be(200);
                expect(JSON.parse(b).user).to.be(undefined);
                done();
            });
        });
    });});
