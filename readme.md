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

### GET /api/user?roles=foo,bar

[{ user... }, { user2... }]

### POST /api/user

``` json
{
  "name": "user1",
  "type": "user",
  "password": "foo",
  "roles": ['admin']
}
```

### GET /api/user/:name

returns user object by username

``` json
{
  "_id": "org.couchdb.user:user1",
  "_rev": "1-123456",
  "name": "user1",
  "type": "user",
  "password": "foo",
  "roles": ['admin']
}
```

### PUT /api/user/:name

updates user object by username

``` json
{
  "_id": "org.couchdb.user:user1",
  "_rev": "1-123456",
  "name": "user1",
  "type": "user",
  "password": "foo",
  "roles": ['admin']
}
```

### DELETE /api/user/:name

Removes user

``` json
{
  "_id": "org.couchdb.user:user1",
  "_rev": "1-123456",
  "name": "user1",
  "type": "user",
  "password": "foo",
  "roles": ['admin']
}
```

## Usage

``` js
var user = require('express-user-couchdb');
var config = { 
  couch: 'http://localhost:5984/foo', 
  email ....
};
app.config(function() {
  // handle other requests first
  app.use(express.router);
  // handle core requests
  app.use(user(config));
});
```

``` json
node init.js [couchdb users db]
```

## what is htmlTemplate and textTemplate

* After Registration
* Forgot Password


## how to setup email options

