# express-user-couchdb - ExpressCouchDb Module

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

## setting up email templates

express-user-couchdb has the capability to attach to an smtp server and send emails for certain user events.  And you have the ability to manipulate the e-mail templates.  

express-user-couchdb uses the nodemailer and email-templates modules to perform the email process, but you need to pass in the config settings in the config argument of the module:

Here is an example of the config settings:

``` js
{
  couch: 'http://localhost:5984/_users',
  email: {
    service: 'SMTP',
    SMTP: {
      ....
    },
    templateDir: ....
  }
}
```

to setup the forgot password email template you need to create a folder called `forgot` in the email template directory, then in that folder you need to create a style.css, html.ejs, and text.ejs.  These files will be used to build your email template.  Here is an example of the text.ejs

* Forgot Password

``` html
Foo App
#######

We are sorry you forgot your password, in order to reset your password,  we need you to click the link below.

Copy Link:

http://fooapp.com/account/reset?code=<%= user.code %>

and paste into your browsers url.

Thank you for supporting our application, please let us know if you have any questions or concerns.

Thanks

The Team
```

* confirm e-mail

If you plan to enable the users to register, you may want to send a confirmation email to them when they sign up.

You would follow the same steps above, but instead of creating a forgot folder, you would need to create a confirm folder and place your css, html.ejs, and text.ejs files.

