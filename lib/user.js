var all = function(doc) {
  if (doc.type === 'user') emit(doc.email, doc);
};

var code = function(doc) {
  if (doc.type === 'user') emit(doc.code, doc);
};

var verification_code = function(doc) {
    if (doc.type === 'user') emit(doc.verification_code, doc);
};

var role = function(doc) {
  doc.roles.forEach(function(role) {
    emit(role, doc);
  });
};

module.exports = {
   _id: "_design/user",
   language: "javascript",
   version: "0.0.1",
   views: {
       all: {
           map: all.toString()
       },
       code: {
         map: code.toString()
       },
       role: {
         map: role.toString()
       }
   }
}