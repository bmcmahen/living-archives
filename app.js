
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var passport = require('passport');
var RedisStore = require('connect-redis')(express);
var config = require('./config');

/**
 * Main App Constructor
 */

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({store: new RedisStore(config.redis), secret: 'scrawnydog' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

/**
 * Local Modules
 */

app.use(require('./lib/frontend'));
app.use(require('./lib/prods'));
app.use(require('./lib/database'));
app.use(require('./lib/exploring-archives'));
app.use(require('./lib/heroes-and-villains'));
app.use(require('./lib/institutions'));
app.use(require('./lib/mindmap'));
app.use(require('./lib/timeline'));

// Development App Configuration
app.configure('development', function(){
  app.use(express.errorHandler());
});

/**
 * Server
 */

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

