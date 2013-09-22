var Documents = require('../database/schema').Document;
var express = require('express');
var path = require('path');
var app = module.exports = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Routes
app.get('/discover/institutions', function(req, res){
  res.render('index');
});

app.get('/discover/institutions/*', function(req, res){
  res.render('index');
});

// app.get('/discover/institutions/places', function(req, res){
//   Documents.find({prods: 'institutions'}, function(err, docs){
//     if (err) return next(err);
//     res.render('institutions', {
//       institutions : docs
//     });
//   });
// });

// app.get('/discover/institutions/institutionalization', function(req, res){
//    res.render('institutionalization');
// });

// app.get('/discover/institutions/deinstitutionalization', function(req, res){
//   res.render('deinstitutionalization');
// });

// app.get('/discover/institutions/contemporary', function(req, res){
//   res.render('contemporary');
// });