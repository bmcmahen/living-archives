var nodemailer = require('nodemailer');
var express = require('express');
var config = require('../../config');
var app = express();

var absoluteURL = (app.get('env') == 'development')
  ? config.domainName.development
  : config.domainName.production;

// We use the nodeMailer npm module, and use SendGrid SMTP transport
// to send emails. Currently, we only use this to invite new users.

var smptTransport = nodemailer.createTransport('SMTP', {
  service: 'SendGrid',
  auth: config.sendgrid
});

exports.smtpTransport = smptTransport;

var mailOptions = function(email, token) {
  return {
    from: 'Living Archives on Eugenics <do-not-reply@eugenicsarchive.ca',
    to: email,
    subject: 'Invitation to access the LAE Database',
    body: 'You have been invited to access the LAE Database. To access '+
      'the database, please click on the following link, and login '+
      'using your Google Account.\n\n'+ absoluteURL +'/auth/login/'+ token
  }
};

exports.mailOptions = mailOptions;

exports.sendMail = function(email, token, next){
  smptTransport.sendMail(mailOptions(email, token), function(err, res){
    next(err, res);
  });
};