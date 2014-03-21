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
  var db = nano(config.users);
  var transport;  
  try {
    transport = nodemailer.createTransport(
      config.email.service, 
      config.email[config.email.service]
    );
  } catch (err) {
    console.log('*** Email Service is not configured ***');
  }

  function verifyUserByEmail(email) {
      var user;
      // use email address to find user
      db.view('user', 'all', { key: email }, saveUserVerificationDetails);

      function saveUserVerificationDetails(err, body) {
          if (err) { throw(err); }

          if (body.rows && body.rows.length === 0) {
              var error = new Error('No user found with the specified email address.');
              error.status_code = 404;
              throw(error);
          }

          user = body.rows[0].value;
          // TODO:  Add an expiration date for the verification code and check it.
          user.verification_code = uuid.v1();
          db.insert(user, user._id, verificationEmail);
      }

      // initialize the emailTemplate engine
      function verificationEmail(err, body) {
          if (err) { throw(err); }
          emailTemplates(config.email.templateDir, renderVerificationTemplate);
      }

      // render verify template
      function renderVerificationTemplate(err, template) {
          if (err) { throw(err); }
          template('verify', { user: user, app: config.app }, sendVerificationEmail);
      }

      // send rendered template to user
      function sendVerificationEmail(err, html, text) {
          if (err) { throw(err); }
          if (!transport) {
              var error = new Error('Mail transport is not configured!');
              error.status_code = 500;
              throw(error);
          }
          transport.sendMail({
              from: config.email.from,
              to: user.email,
              subject: config.app.name + ': Please Verify Your Account',
              html: html,
              text: text }, done);
      }

      // complete action
      function done(err, status) {
          if (err) { throw(err); }
          //app.emit('user: verify account', user);
      }
  }

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
      if (err) { return res.send(err.status_code, err); }

      if (config.verify) {
        try {
            verifyUserByEmail(req.body.email);
            res.send(body);
            //app.emit('user:signed-up', body);
        }
        catch (err) {
            res.send(err.status_code, err);
        }
      }
    }
  });

  // login user
  
  // required properties on req.body

  // * name
  // * password
  app.post('/api/user/signin', function(req, res) {
    db.auth(req.body.name, req.body.password, genSession);

    function genSession(err, body, headers) {
      if (err) { return res.send(err.status_code, err); }
      db.get('org.couchdb.user:' + body.name, function(err, user) {
        if (err) { return res.send(err.status_code, err); }

        if (config.verify && !user.verified) {
            return res.send(401, { error: 'You must verify your account before you can log in.  Please check your email (including spam folder) for more details.'});
        }

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
      if (err) { return res.send(err.status_code, err); }

      if (body.rows && body.rows.length === 0) {
        return res.send(500, { ok: false, message: 'No user found with that email.' });
      }

      user = body.rows[0].value;
      // generate uuid save to document
      user.code = uuid.v1();
      db.insert(user, user._id, createEmail);
    }

    // initialize the emailTemplate engine
    function createEmail(err, body) {
      if (err) { return res.send(err.status_code, err); }
      emailTemplates(config.email.templateDir, renderForgotTemplate);
    }

    // render forgot.ejs
    function renderForgotTemplate(err, template) {
      if (err) { return res.send(err.status_code, err); }
      // use header host for reset url
      config.app.url = 'http://' + req.headers.host;
      template('forgot', { user: user, app: config.app }, sendEmail);
    }

    // send rendered template to user
    function sendEmail(err, html, text) {
      if (err) { return res.send(err.status_code, err); }
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
      if (err) { return res.send(err.status_code, err); }
      res.send({ ok: true });
      //app.emit('user: forgot password', user);
    }
  });


  app.get('/api/user/code/:code', function(req, res) {
    if (!req.params.code) {
      return res.send(500, {ok: false, message: 'No code sent.'});
    }

    db.view('user', 'code', {key: req.params.code}, function(err, body) {
      if (err) { return res.send(err.status_code, err); }
      if (body.rows.length > 1) {
        return res.send(500, { ok: false, message: 'More than one user found.'});
      } else if (body.rows.length === 0) {
        return res.send(500, {ok: false, message: 'Reset code is not valid.'})
      } else {
        var user = body.rows[0].value;
        var name = user.name;
        if (user.fname && user.lname) {
          name = user.fname + ' ' + user.lname;
        }
        return res.send(200, {ok: true, user: { name: name } });
      }
    });
  });

  app.post('/api/user/reset', function(req, res) {
    // get user by code
    db.view('user', 'code', { key: req.body.code }, checkCode);
    function checkCode(err, body) {
      if (err) { return res.send(err.status_code, err); }
      if (body.rows && body.rows.length === 0) {
        return res.send(500, {ok: false, message: 'Not Found'});
      }
      var user = body.rows[0].value;
      user.password = req.body.password;
      // clear code
      delete user.code;
      db.insert(user, user._id).pipe(res);
    }
  });

    // Send (or resend) verification code to user
    app.get('/api/user/verify', function(req, res) {
        return res.send(400, {ok: false, message: 'An email address is required before a verification code can be sent.'});
    });

    // Send (or resend) verification code to user
    app.get('/api/user/verify/:email', function(req, res) {
        if (!req.params.email) {
            return res.send(400, {ok: false, message: 'An email address must be passed as part of the query string before a verification code can be sent.'});
        }

        try {
            verifyUserByEmail(req.params.email);
            res.send(200,"Verification code sent...");
        }
        catch (err) {
            res.send(err.status_code, err);
        }
    });


    // Accept a verification code and flag the user as verified.
    // required properties on req.body
    // * email
    // * code
    app.post('/api/user/verify', function(req,res) {
        if (!req.body.email || !req.body.code) {
            return res.send(400, {ok: false, message: 'An email address and verification code are required in order to verify an account.'});
        }

        var user;
        // use email address to find user
        db.view('user', 'all', { key: req.body.email }, saveUser);

        function saveUser(err, body) {
            if (err) { return res.send(err.status_code, err); }

            if (body.rows && body.rows.length === 0) {
                return res.send(404, { ok: false, message: 'No user found with that email.' });
            }

            // TODO:  Add an expiration date for the verification code and check it.

            user = body.rows[0].value;
            if (!user.verification_code || user.verification_code !== req.body.code) {
                return res.send(400, { ok: false, message: 'The verification code you attempted to use does not match our records.' });
            }

            delete user.verification_code;
            user.verified = new Date();
            db.insert(user, user._id, function(err, body) {
                if (err) { return res.send(err.status_code, err); }
                return res.send(200,"Account verified.")
            });
        }

        res.send(500,'Unknown error verifying user account...');
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
      if (err) { return res.send(err.status_code, err); }
      res.send(body);
    });
  });

  app.get('/api/user', function(req, res) {
    if (!req.query.roles) { return res.send(500, {message: 'Roles are required!'}); }
    var keys = req.query.roles.split(',');
    db.view('user', 'role', {keys: keys}, function(err, body) {
      if (err) { return res.send(err.status_code, err); }
      var users = _(body.rows).pluck('value');
      res.send(users);
    });
  });

  return app;
};
