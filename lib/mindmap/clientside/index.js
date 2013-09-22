require('./controller');
var $ = require('jquery');
var cookie = require('cookie');

var Tip = require('tip');
Tip('a[title]', {auto: false});

// Handle Feature introduction
var intro = require('intro.js').introJs;

function startIntro(){
  intro()
    .setOptions({ skipLabel: "Exit Tour" })
    .start();
}

// Only automatically start the introduction if
// this is the first time the user has visited this
// particular prod. We store cookies to determine
// if the user is returning.
var hasVisited = cookie('mindmap');
if (!hasVisited) {
  startIntro();
  cookie('mindmap', 'visited');
}

// You can always trigger the
$('#help').on('click', function(e){
  e.preventDefault();
  startIntro();
});