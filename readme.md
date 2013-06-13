# CDU - CouchDbUsers Module

This module is a simple authentication api built on top of couch's user model.

## requirements

* couchdb
* nodejs

## init example

``` js
var couchUser = require('express-couchUser');
var express = require('express');
var app = express();

app.configure(function() {
  app.use(couchUser(config));
});

```

## API Commands

* signUp(name, password, data, email?, callback);
* signIn(name, password, callback);
* signOut(name, callback);
* forgot(email, htmlTemplate, textTemplate, callback);
---
* verify(name, code, callback);
* reset(name, code, callback);
* getUser(name, callback);
* setUser(name, data, callback);
* rmUser(name, callback);

## Events

* registered
* loggedIn
* loggedOut
* forgotPassword
* resetPassword
* getUser
* setUser
* rmUser

## setup

## usage example

## what is htmlTemplate and textTemplate

## how to setup email options

