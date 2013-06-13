module.exports = {
   _id: "_design/user",
   language: "javascript",
   version: 1,
   views: {
       all: {
           map: "function(doc) {\n  if (doc.type === 'user') {\n    emit(doc.email, doc);\n  }\n}"
       }
   }
}