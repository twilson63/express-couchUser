// the purpose of this script 
// is to create a couch db design doc 
// and view for the model list functionality
var nano = require('nano');
var userView = require('./lib/user');

module.exports = init = function(couch) {
  var db = nano(couch);
  db.insert(userView,'_design/user',
    function(err, body) {
      if(!module.parent) {
        console.log(body);
      }
    })
}

if (!module.parent) {
  if (process.argv[2]) { 
    init(process.argv[2]);
  } else {
    console.log('couchdb url required');
  }
}
