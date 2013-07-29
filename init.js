// the purpose of this script 
// is to create a couch db design doc 
// and view for the model list functionality
var nano = require('nano');
var userView = require('./lib/user');

module.exports = init = function(couch, cb) {
  var db = nano(couch);
  db.get('_design/user', function(err, doc) {
    if (!doc || userView.version > doc.version) {
      if (doc) { userView._rev = doc._rev; }
      db.insert(userView,'_design/user', function(err, body) {
        if (err) {
          console.log(err);
          if (cb) { cb(err); }
        }
        if (!module.parent) { console.log(body); }
        if (cb) { cb(null); }
      });
    }
  });
}

if (!module.parent) {
  if (process.argv[2]) { 
    init(process.argv[2]);
  } else {
    console.log('couchdb url required');
  }
}
