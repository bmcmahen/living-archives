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
