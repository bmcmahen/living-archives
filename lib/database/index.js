var express = require('express');
var app = module.exports = express();
var path = require('path');

app.use(require('./routes'));
app.use(require('./api'));

require('./accounts');
require('./email');