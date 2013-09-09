var Documents = require('./schema').Document;
var Users = require('./schema').User;
var moment = require('moment');
var passport = require('passport');
var generateToken = require('./accounts').generateToken;
var sendMail = require('./email').sendMail;
var express = require('express');
var app = module.exports = express();
var path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.locals.title = 'LAE Database';

/////////////////////
// Database Routes //
/////////////////////

// Helpers:

function humanizeDate(jsdate){
  var d = moment(jsdate);
  return d.format('dddd, MMMM Do YYYY, h:mm:ss a');
}

var requireUser = function(req, res, next){
  if (!req.user) return res.redirect('/auth/login');
  res.locals.currentUser = req.user;
  next();
};

var userOrNull = function(req, res, next){
  res.locals.currentUser = req.user ? req.user : null;
  next();
};


////////////////////
// AUTHENTICATION //
////////////////////

// Show our login button / form.
// These probably belong in accounts...
app.get('/auth/login', userOrNull, function(req, res) {
  res.render('login', { title: 'Living Archives on Eugenics' });
});

// Logout
app.get('/auth/logout', userOrNull, function(req, res) {
  req.logout();
  res.redirect('login');
});

// Login using Google oAuth
// What I need to do is have two different strategies, one
// for when token is present, and one without token present.
// The strategy in which token is present will authenticate
// any user.

app.get('/auth/login/google', passport.authenticate('google', {
  scope: ['https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email']
}));

// Express will store our email token in req.session.token
app.get('/auth/login/:token', userOrNull, function(req, res){
  req.session.token = req.params.token;
  res.render('login', { title: 'Living Archives on Eugenics' });
});

// Google oAuth callback handler
app.get('/auth/google/return',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  function(req, res){
    res.redirect('/database');
  });

// Invite an new user
app.post('/auth/newuser', requireUser, function(req, res){
  var email = req.body.email;
  // if the user already exists, let's just send them another email.
  Users.findOne({email: email}, function(err, usr){
    if (!usr) {
      // Create user
      var token = generateToken();
      Users.create({ email: email, token: token }, function(err, user){
        if (!err) send(email, token);
      });
    } else {
      if (!err) send(usr.email, usr.token);
    }
  });

  var send = function(email, token){
    sendMail(email, token, function(err){
      if (!err) return res.redirect('/auth/accounts');
    });
  };
});

// Render invite user form
app.get('/auth/accounts', requireUser, function(req, res){
  Users.find({}, function(err, users){
    res.render('accounts', { users : users });
  });
});

// DATABASE ROUTES

// Our database is open for read access to anyone
// The database greeting page
app.get('/database', function(req, res){
  res.render('app-index', {
    currentUser : req.user
  });
});

app.get('/database/*', function(req, res){
  res.render('app-index', {
    currentUser : req.user
  });
});

// But altering any of the data requires user access.
app.post('/database/*', requireUser);
app.put('/database/*', requireUser);
app.delete('/database/*', requireUser);
