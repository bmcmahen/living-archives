var crypto = require('crypto');
var passport = require('passport');
var Users = require('./schema').User;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var config = require('../../config');
var express = require('express');
var app = express();

var credentials = (app.get('env') == 'development')
	? config.google.development
	: config.google.production;


// Basic Strategy:

// An admin can invite a user by email address. This will create a
// new user account with an email & generated token. This will send an email
// to that user, with the link. We allow the user to sign in using
// Google accounts. This should handle authentication. If
// they have the generated token, then we update their user document
// with an OpenId. Then, in the future, if they login and we already
// have their OpenId, we allow them to login.

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done){
	Users.findById(id, function(err, usr) {
		done(err, usr);
	});
});


// Passport Strategies
//
// Google:
// You can login under 3 conditions:
// (1) You can properly authenticate a Google Account.
// (2) The Google Account ID exists in our database.
// (3) You have visited the site with a loginToken that belongs to the user.

passport.use(new GoogleStrategy(credentials, function(req, token, tokenSecret, profile, next) {
	Users.findOne({ '$or' :
			[{ googleId: profile.id }, { token: req.session.token }]
		}, function(err, usr) {
			if (usr && usr.googleId == null) {
				usr.set({ googleId: profile.id, name: profile.displayName });
				usr.save(function(err, usr){
					next(err, usr);
				});
			} else {
				next(err, usr);
			}
	});
}));

// When inviting a new user, generate a token, add it to the user
// object, and then append it to the link.
// This will allow them to create an account.

exports.generateToken = function() {
	try {
		var buf = crypto.randomBytes(32);
		return buf.toString('hex');
	} catch (err) {
		return new Error('Failed to generate token');
	}
};

