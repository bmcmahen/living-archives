var slider = require('fluid-slider');
var events = require('event');
var classes = require('classes');
var Route = require('route');

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

window.swipe = insta.swiper;

events.bind(next, 'click', function(e){
  e.preventDefault();
  insta.swiper.next();
});

events.bind(prev, 'click', function(e){
  e.preventDefault();
  insta.swiper.prev();
});

// Router
// This is less than ideal... the basic idea is that,
// since each prod is rendered on the server, we need some
// way on the client to indicate which prod is currently
// selected. Then, we need to highlight and make that prod
// in view, in the list...
var currentRoute = new Route('/discover/:prod');
var match = currentRoute.match(window.location.pathname);
if (match){
  switch (match.prod) {
    case 'institutions':
      insta.swiper.show(4, 0);
      break;
    case 'mindmap':
      insta.swiper.show(3, 0);
      break;
  }
}