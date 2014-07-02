# express-user-couchdb - ExpressCouchDb Module

[![Build Status](https://secure.travis-ci.org/twilson63/express-couchUser.png)](http://travis-ci.org/twilson63/express-couchUser)

This module is a authentication lib built on top of couch's user model.

## requirements

* couchdb
* nodejs

## init example

``` js
var couchUser = require('express-couchUser');
var express = require('express');
var app = express();

// Required for session storage
app.use(express.cookieParser());
app.use(express.session({ secret: 'Use something else here.'}));

app.configure(function() {
  app.use(couchUser({
    users: 'http://localhost:5984/_users',
    email: {
      ...
    },
    adminRoles: [ 'admin' ],
    validateUser: function(data, cb) {...}
  }));
});

```
The optional adminRoles attribute allows you to specify one or more administrative roles that are allowed to add, update, and delete users.

The optional validateUser allows you to specify extra validation other than username/password. For example, checking for greater than x number of login attempts. The first argument data is an object that has request, user, and headers fields. The reason the callback pattern is used to pass out the result is that you can do async calls within this function (like check another database, etc).

Example validateUser function.

``` js
validateUser: function(data, cb) {
  var MAX_FAILED_LOGIN = 5;
  var req = data.req;     //all the fields in data is captured from /api/user/signin callback function
  var user = data.user;
  var headers = data.headers;
  var outData = {         // This object will be attached to the session 
    userInfo: "userAge"   // req.session.userInfo will be "userAge"
  };

  if(data.user.failedLogin > MAX_FAILED_LOGIN) {
    //fails check
    var errorPayload = {
      statusCode: 403,                           //if not included will default to 401 
      message: 'Exceeded fail login attempts',   //if not included will default to 'Invalid User Login'
      error: 'Forbidden'                         //if not included will default 'unauthorized'
    }
    cb(errorPayload);
  } else {
    //passess check
    cb(null, outData);
  }
}
```

## Initialize CouchDb

Before you can use this module, you need to run a setup process to add the required views to the couchDb Users table, there is an `init.js` file that does this for you.  You can include it in your Gruntfile as a task.

``` js
grunt.registerTask('setup', 'setup database', function() {
  var userSetup = require('./node_modules/express-user-couchdb/init');
  userSetup('http://localhost:5984/_users', function(err) {
    console.log("configured express-user-couchdb module");
  });
});
```

or you can invoke via command line

``` sh
node ./node_modules/express-user-couchdb/init http://localhost:5984/_users
```

## API Commands

### POST /api/user/signup

Create a new user account.  If config.verify is set, the user will be sent an email with a link to verify their account.
If the user trying to login has enabled set to false, they will be notified to contact an admin to reactivate their account.

``` json
{
  "name": "user",
  "password": "password",
  "email": "user@email.com",
  "data": {}
}
```

### POST /api/user/signin

Allow a user to log in.  If config.verify is set, then the user is required to validate their email address before logging in.

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

### GET /api/user/current

The currently logged in user.  Returns a 401 error if the user is not currently logged in.


### POST /api/user/forgot

If the user trying to retrieve their password has enabled set to false, they will be notified to contact an admin to reactivate their account.

``` json
{
  "email": "user@email.com"
}
```

### POST /api/user/verify:email

Send an email to a user that includes a verification code and link to verify their account.

``` json
{
  "name": "email"
}
```

### POST /api/user/verify/:code

Confirm that a user's email address is valid using a previously generated verification code.

### POST /api/user/reset

Reset a user's password (requires the code generated using /api/user/forgot).

``` json
{
  "name": "user",
  "code": "code"
}
```

### GET /api/user?roles=foo,bar

Return a list of users matching the specified roles.

[{ user... }, { user2... }]

### POST /api/user

Create a new user.  If config.adminRoles is set, the user making this call must have one of the specified roles.

``` json
{
  "name": "user1",
  "type": "user",
  "password": "foo",
  "roles": ['admin']
}
```

### GET /api/user/:name

Returns the user whose name matches :name.

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

Updates the user specified by :name.  If config.adminRoles is set, then a user must have an admin role to be able to update anyone else's record.  Non-admins cannot update their own role information.

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

Removes the specified user.  If config.adminRoles is set, then a user must have an admin role to be able to delete a user.

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
  users: 'http://localhost:5984/_users', 
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

### Forgot Password

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

### confirm e-mail

If you plan to enable the users to register, you may want to send a confirmation email to them when they sign up.

You would follow the same steps above, but instead of creating a forgot folder, you would need to create a confirm folder and place your css, html.ejs, and text.ejs files.

## Contribution

Pull requests are welcome.

## License

MIT

## Support

Please add issues to the github repo.

## Thanks

* CouchDb Team
* NodeJS Team
* NodeMailier
* Nano Team
* Email-Templates


