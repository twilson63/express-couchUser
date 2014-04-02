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
var only = require('only');

module.exports = function(config) {
  var safeUserFields = config.safeUserFields ? config.safeUserFields : "name email roles";
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
            validateUserByEmail(req.body.email);
            db.get(body._id, function(err,user) {
                if (err) { return res.send(err.status_code, err); }
                res.send(200, JSON.stringify({ok: true, user: strip(user)}));
            });
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
            return res.send(401, JSON.stringify({ ok: false, message: 'You must verify your account before you can log in.  Please check your email (including spam folder) for more details.'}));
        }

        delete user.salt;
        req.session.regenerate(function() {
          req.session.user = user;
          req.session.save();

          res.writeHead(200, { 'set-cookie': headers['set-cookie']});
          res.end(JSON.stringify({ok:true, user: strip(user)}));
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
    res.send(200,JSON.stringify({ok: true, message: "You have successfully logged out."}));
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
        return res.send(500, JSON.stringify({ ok: false, message: 'No user found with that email.' }));
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
      res.send(200, JSON.stringify({ ok: true, message: "forgot password link sent..." }));
      //app.emit('user: forgot password', user);
    }
  });


  app.get('/api/user/code/:code', function(req, res) {
    if (!req.params.code) {
      return res.send(500, JSON.stringify({ok: false, message: 'You must provide a code parameter.'}));
    }

    db.view('user', 'code', {key: req.params.code}, function(err, body) {
      if (err) { return res.send(err.status_code, err); }
      if (body.rows.length > 1) {
        return res.send(500, JSON.stringify({ ok: false, message: 'More than one user found.'}));
      } else if (body.rows.length === 0) {
        return res.send(500, JSON.stringify({ok: false, message: 'Reset code is not valid.'}));
      } else {
        var user = body.rows[0].value;
        var name = user.name;
        if (user.fname && user.lname) {
          name = user.fname + ' ' + user.lname;
        }
        return res.send(200, JSON.stringify({ok: true, user: strip(user) }));
      }
    });
  });

    // reset user password
    // required properties on req.body
    // * code (generated by /api/user/forgot)
    // * password
  app.post('/api/user/reset', function(req, res) {
    if (!req.body.code || !req.body.password) {
        return res.send(400, JSON.stringify({ok: false, message: 'A password and valid password reset code are required.'}));
    }

      // get user by code
    db.view('user', 'code', { key: req.body.code }, checkCode);
    function checkCode(err, body) {
      if (err) { return res.send(err.status_code, err); }
      if (body.rows && body.rows.length === 0) {
        return res.send(500, JSON.stringify({ok: false, message: 'Not Found'}));
      }
      var user = body.rows[0].value;
      user.password = req.body.password;
      // clear code
      delete user.code;
      db.insert(user, user._id, function(err,user) {
          if (err) { return res.send(err.status_code, err); }
          return res.send(200, JSON.stringify({ok: true, user: strip(user) }));
      });
    }
  });

    // Send (or resend) verification code to a user's email address
    // required properties on req.body
    // * email
    app.post('/api/user/verify', function(req, res) {
        if (!req.body.email) {
            return res.send(400, JSON.stringify({ok: false, message: 'An email address must be passed as part of the query string before a verification code can be sent.'}));
        }

        try {
            validateUserByEmail(req.body.email);
            res.send(200,JSON.stringify({ok:true, message: "Verification code sent..."}));
        }
        catch (err) {
            res.send(err.status_code, err);
        }
    });


    // Accept a verification code and flag the user as verified.
    // required properties on req.params
    // * code
    app.get('/api/user/verify/:code', function(req,res) {
        if (!req.params.code) {
            return res.send(400, JSON.stringify({ok: false, message: 'A verification code is required.'}));
        }

        var user;
        // use verification code
        db.view('user', 'verification_code', { key: req.params.code }, saveUser);

        function saveUser(err, body) {
            if (err) { return res.send(err.status_code, err); }

            if (body.rows && body.rows.length === 0) {
                return res.send(400, JSON.stringify({ ok: false, message: 'Invalid verification code.' }));
            }

            // TODO:  Add an expiration date for the verification code and check it.

            user = body.rows[0].value;
            if (!user.verification_code || user.verification_code !== req.params.code) {
                return res.send(400, JSON.stringify({ ok: false, message: 'The verification code you attempted to use does not match our records.' }));
            }

            delete user.verification_code;
            user.verified = new Date();
            db.insert(user, user._id, function(err, body) {
                if (err) { return res.send(err.status_code, err); }
                return res.send(200,JSON.stringify({ok:true, message: "Account verified."}));
            });
        }
    });

    app.get('/api/user/current', function(req, res) {
        if (!req.session || !req.session.user) {
            return res.send(400,JSON.stringify({ok:false, message: "Not currently logged in."}));
        }

        res.send(200, JSON.stringify({ok: true, user: strip(req.session.user)}));
    });

  app.get('/api/user/:name', function(req, res) {
      if (!req.session || !req.session.user) {
          return res.send(400,JSON.stringify({ok:false, message: "You must be logged in to use this function"}));
      }
      db.get('org.couchdb.user:' + req.params.name, function(err,user) {
          if (err) { return res.send(err.status_code, err); }
          return res.send(200, JSON.stringify({ok: true, user: strip(user) }));
      });
  });

  app.put('/api/user/:name', function(req, res) {
    if (!req.session || !req.session.user) {
        return res.send(400,JSON.stringify({ ok:false, message: "You must be logged in to use this function"}));
    }

    db.get('org.couchdb.user:' + req.params.name, function(err, user) {
        if (err) { return res.send(err.status_code, err); }

        var updates = strip(req.params);
        var keys = Object.keys(updates);
        for (var i in keys) {
            var key = keys[i];
            user[key] = updates[keys];
        }
        db.insert(user, 'org.couchdb.user:' + req.params.name, function(err, updatedUser) {
            if (err) { return res.send(err.status_code, err); }
            return res.send(200, JSON.stringify({ok: true, user: strip(updatedUser) }));
        });
    });
  });

  app.del('/api/user/:name', function(req,res) {
      if (!req.session || !req.session.user) {
          return res.send(400, JSON.stringify({ok: false, message: "You must be logged in to use this function"}));
      }
      db.get('org.couchdb.user:' + req.params.name, function(err,user) {
          if (err) { return res.send(err.status_code, err); }

          db.destroy(user._id, user._rev, function(err,body) {
              if (err) { return res.send(err.status_code, err); }
              return res.send(200,JSON.stringify({ok:true, message: "User '" + req.params.name + "' deleted."}));
          });
      });
  });

  // # user crud api
  app.post('/api/user', function(req, res) {
    if (!req.session || !req.session.user) {
        return res.send(400, JSON.stringify({ok:false, message: "You must be logged in to use this function"}));
    }
    req.body.type = 'user';
    db.insert(req.body, 'org.couchdb.user:' + req.body.name, function(err, user) {
      if (err) { return res.send(err.status_code, err); }
      res.send(200, JSON.stringify({ok: true, user: strip(user)}));
    });
  });

  app.get('/api/user', function(req, res) {
    if (!req.session || !req.session.user) {
        return res.send(400,JSON.stringify({ok:false, message: "You must be logged in to use this function"}));
    }
    if (!req.query.roles) { return res.send(500, JSON.stringify({ok:false, message: 'Roles are required!'})); }
    var keys = req.query.roles.split(',');
    db.view('user', 'role', {keys: keys}, function(err, body) {
      if (err) { return res.send(err.status_code, err); }
      var users = _(body.rows).pluck('value');
      res.send(200, JSON.stringify({ok: true, users: stripArray(users)}));
    });
  });

    function strip(value) {
        return only(value, safeUserFields);
    }

    function stripArray(array) {
        var returnArray = [];
        array.forEach(function(value) { returnArray.push(only(value, safeUserFields)); });
        return returnArray;
    }

    function validateUserByEmail(email) {
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

  return app;
};
