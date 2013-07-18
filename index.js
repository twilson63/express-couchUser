var express = require('express');
var nano = require('nano');
var app = express();
var events = require('events');
var uuid = require('uuid');
var emailTemplates = require('email-templates');
var nodemailer = require('nodemailer');
var userView = require('./lib/user');

module.exports = function(config) {
  // add event emitter to 
  //app.ee = new events.EventEmitter();
  events.EventEmitter.call(app);
  var couch = nano(config.db);
  var db = couch.use('_users');
  var transport = nodemailer.createTransport(
    config.email.service, 
    config.email[config.email.service]
  );

  // add/update view
  db.get('_design/user', function(err, body) {
    if (err && err.error === 'not_found') {
      return db.insert(userView, '_design/user').pipe(process.stdout); 
    }
    if (body.version !== userView.version) {
      userView._rev = body._rev;
      db.insert(userView, '_design/user').pipe(process.stdout);
    }
  });
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
    couch.auth(req.body.name, req.body.password, genSession);

    function genSession(err, body, headers) {
      if (err) { return res.send(500, err); }
      req.session.regenerate(function() {
        req.session.user = req.body.name;
        res.writeHead(200, { 'set-cookie': headers['set-cookie']});
        res.end(JSON.stringify(body));
        //app.emit('user:signed-in', body);
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
    //app.emit('user:signed-out', body);
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
      console.log(body);
      user = body.rows[0].value;
      // generate uuid save to document
      user.code = uuid.v1();
      db.insert(user, user._id, createEmail)
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
    app.emit('user: get', { name: req.params.name });
  });

  app.put('/api/user/:name', function(req, res) {
    db.insert(req.body, 'org.couchdb.user:' + req.params.name).pipe(res);
    app.emit('user: save', { name: req.params.name });
  });

  app.del('/api/user/:name', function(res,res) {
    db.destroy('org.couchdb.user:' + req.params.name).pipe(res);
    app.emit('user: destroy', { name: req.params.name });
  });

  return app;
}