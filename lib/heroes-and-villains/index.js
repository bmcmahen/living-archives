var express = require('express');
var app = module.exports = express();
var path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Routes
app.get('/discover/heroes', function(req, res){
	res.render('index');
});

app.get('/discover/heroes/*', function(req, res){
  res.render('index');
});