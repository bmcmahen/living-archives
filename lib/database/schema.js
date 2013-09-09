var mongoose = require('mongoose');
var _ = require('underscore');
var Schema = mongoose.Schema;
var moment = require('moment');
var config = require('../../config');

console.log(config.mongo);

// Connect to our Mongod instance
mongoose.connect(config.mongo);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function() {
  console.log("Database connection open");
});

// Database Entry Schema
// NOTE: I've decided to store dates in their original string format. This is
// because we sometimes (commonly) only deal with years. And year-strings, when
// turned into dates, are given a month and day. For things (like the timeline)
// that require specific date formats, we should parse the string into a date format.
var documentSchema = new Schema({
  title: String,
  shortDescription: String,
  fullDescription: String,
  created: { type: Date, default: Date.now },
  image: {},
  prods: [],
  type: String,
  date: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  dateOfBirth: { type: String },
  dateOfDeath: { type: String },
  connections: [{ type: Schema.Types.ObjectId, ref: 'Links' }]
}, { strict: false });

exports.Document = mongoose.model('Document', documentSchema);


// User Schema for Database Login
var userSchema = new Schema({
  googleId: String,
  name: String,
  email: String,
  emailToken: String
}, {strict: false});

exports.User = mongoose.model('User', userSchema);


var linkSchema = new Schema({
  strength: Number,
  from: mongoose.Schema.Types.Mixed,
  to: mongoose.Schema.Types.Mixed
});

exports.Links = mongoose.model('Links', linkSchema);


