var slider = require('fluid-slider');
var events = require('event');
var classes = require('classes');

var el = document.getElementById('js-swipe');
var breakPoints = {
  0: 3,
  500: 4,
  700: 5,
  875: 6,
  1050: 7,
  1200: 8
};
var insta = slider(el, { breakpointItems: breakPoints } );
var next = document.querySelector('.next-button');
var prev = document.querySelector('.prev-button');

function toggleVisibility(){
  if (insta.swiper.isLast()){ classes(next).add('hide') }
  else { classes(next).remove('hide'); }
  if (insta.swiper.isFirst()){ classes(prev).add('hide')}
  else { classes(prev).remove('hide'); }
}

toggleVisibility();
insta.swiper.on('show', toggleVisibility);

events.bind(next, 'click', function(e){
  e.preventDefault();
  insta.swiper.next();
});

events.bind(prev, 'click', function(e){
  e.preventDefault();
  insta.swiper.prev();
});