var express = require('express');
var app = module.exports = express();
var path = require('path');

// NODE_PATH=lib

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.get('/discover/exploring', function(req, res){
	res.render('index');
});