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

### POST /api/user/signup

``` json
{
  "name": "user",
  "password": "password",
  "email": "user@email.com",
  "data": {}
}
```

### POST /api/user/signin

``` json
{
  "name": "user",
  "password": "password"
}
```

### POST /api/user/signout

``` json
{
  "name": "user"
}
```

### POST /api/user/forgot

``` json
{
  "email": "user@email.com"
}
```

### POST /api/user/verify

``` json
{
  "name": "user",
  "code": "code"
}
```

### POST /api/user/reset

``` json
{
  "name": "user",
  "code": "code"
}
```

### GET /api/user

### POST /api/user

### GET /api/user/:id

### PUT /api/user/:id

### DELETE /api/user/:id


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

