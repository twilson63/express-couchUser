// # expressUserCouchDb
//
// This module is an express plugin module, which means you can 
// require the module in your express app, and add it to your express 
// application by using `app.use(user(config));`
//
var express = require('express');
var nano = require('nano');
var app = express();
var uuid = require('uuid');
var emailTemplates = require('email-templates');
var nodemailer = require('nodemailer');
var userView = require('./lib/user');
var _ = require('underscore');

module.exports = function(config) {
  var db = nano(config.couch);
  var transport;  
  try {
    transport = nodemailer.createTransport(
      config.email.service, 
      config.email[config.email.service]
    );
  } catch (err) {
    console.log('*** Email Service is not configured ***');
  }

  // ## register user

  // required properties on req.body
  // * name
  // * password
  // * email
  //
  // ### note: you can add more properties to 
  // your user registration object
  app.post('/api/user/signup', function(req, res) {
    delete req.body.confirm_password;
    req.body.type = 'user';
    db.insert(req.body, 'org.couchdb.user:' + req.body.name, done);

    function done(err, body) {
      if (err) { return res.send(500, err); }
      res.send(body);
      //app.emit('user:signed-up', body);
    }
  });

  // login user
  
  // reequired properties on req.body

  // * name
  // * password
  app.post('/api/user/signin', function(req, res) {
    db.auth(req.body.name, req.body.password, genSession);

    function genSession(err, body, headers) {
      if (err) { return res.send(500, err); }
      db.get('org.couchdb.user:' + body.name, function(err, user) {
        if (err) { return res.send(500, err); }
        delete user.salt;
        req.session.regenerate(function() {
          req.session.user = user;
          res.writeHead(200, { 'set-cookie': headers['set-cookie']});
          res.end(JSON.stringify(user));
        });
      });
    }
  });

  // logout user
  
  // required properties on req.body

  // * name
  app.post('/api/user/signout', function(req, res) {
    req.session.destroy();
    res.clearCookie('AuthSession');
    res.send({ok: true});
  });

  // forgot user password
  
  // required properties on req.body

  // * email
  app.post('/api/user/forgot', function(req,res) {
    var user;
    // use email address to find user
    db.view('user', 'all', { key: req.body.email }, saveUser);

    // generate uuid code
    // and save user record
    function saveUser(err, body) {
      if (err) { return res.send(500, err); }
      user = body.rows[0].value;
      // generate uuid save to document
      user.code = uuid.v1();
      db.insert(user, user._id, createEmail);
    }

    // initialize the emailTemplate engine
    function createEmail(err, body) {
      if (err) { return res.send(500, err); }
      emailTemplates(config.email.templateDir, renderForgotTemplate);
    }

    // render forgot.ejs
    function renderForgotTemplate(err, template) {
      if (err) { return res.send(500, err); }
      template('forgot', { user: user, app: config.app }, sendEmail);
    }

    // send rendered template to user
    function sendEmail(err, html, text) {
      if (err) { return res.send(500, err); }
      if (!transport) { return res.send(500, { error: 'transport is not configured!'}); }
      transport.sendMail({
        from: config.email.from,
        to: user.email,
        subject: config.app.name + ': Reset Password Request',
        html: html,
        text: text }, done);
    }

    // complete action
    function done(err, status) {
      if (err) { return res.send(500, err); }
      res.send({ ok: true });
      //app.emit('user: forgot password', user);
    }
  });

  app.post('/api/user/reset', function(req, res) {
    // get user by code
    db.view('user', 'code', { key: req.body.code }, checkCode);
    function checkCode(err, body) {
      if (err) { return res.send(500, err); }
      if (body.rows && body.rows.length === 0) {
        return res.send(500, {message: 'Not Found'});
      }
      var user = body.rows[0].value;
      user.password = req.body.password;
      // clear code
      user.code = '';
      db.insert(user, user._id).pipe(res);
    }
  });

  app.get('/api/user/:name', function(req, res) {
    db.get('org.couchdb.user:' + req.params.name).pipe(res);
  });

  app.put('/api/user/:name', function(req, res) {
    db.insert(req.body, 'org.couchdb.user:' + req.params.name).pipe(res);
  });

  app.del('/api/user/:name', function(req,res) {
    db.destroy('org.couchdb.user:' + req.params.name, req.body._rev).pipe(res);
  });

  // # user crud api
  app.post('/api/user', function(req, res) {
    req.body.type = 'user';
    db.insert(req.body, 'org.couchdb.user:' + req.body.name, function(err, body) {
      if (err) { return res.send(500, err); }
      res.send(body);
    });
  });

  app.get('/api/user', function(req, res) {
    if (!req.query.roles) { return res.send(500, {message: 'Roles are required!'}); }
    var keys = req.query.roles.split(',');
    db.view('user', 'role', {keys: keys}, function(err, body) {
      if (err) { return res.send(500, err); }
      var users = _(body.rows).pluck('value');
      res.send(users);
    });
  });

  return app;
};
