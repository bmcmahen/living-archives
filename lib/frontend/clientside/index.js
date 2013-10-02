var slider = require('fluid-slider');
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