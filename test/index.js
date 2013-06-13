var express = require('express');
var app = express();
var path = require('path');

var couchUser = require('../');

var config = {
  db: 'http://sa:stars@localhost:5984',
  app: {name: 'FooBar'},
  email: { 
    smtp: {
      service: "Gmail",
      auth: {
        user: 'twilson63@gmail.com',
        pass: 'xxxxx'
      }
    },
    from: 'twilson63@gmail.com',
    templateDir: path.join(__dirname, 'emailTpls') }
  };

app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.cookieParser('supersecret'));
app.use(express.session());

app.use(couchUser(config));
//console.log(cdu.ee.emit('foo', 'bar'));
cdu.on('user:signed-up', function() {         
  console.log('signed-up'); 
});
cdu.on('user:signed-in', function() {         
  console.log('signed-in'); 
});
cdu.on('user:signed-out', function() {         
  console.log('signed-out'); 
});

app.listen(3000);