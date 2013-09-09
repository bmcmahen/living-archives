// https://developer.mozilla.org/en-US/docs/CSS/Tutorials/Using_CSS_animations/Detecting_CSS_animation_support

var animation = false,
    animationstring = 'animation',
    keyframeprefix = '',
    domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
    pfx  = '';

var el = document.createElement('div');
if( el.style.animationName ) { animation = true; }

if( animation === false ) {
  for( var i = 0; i < domPrefixes.length; i++ ) {
    if( el.style[ domPrefixes[i] + 'AnimationName' ] !== undefined ) {
      pfx = domPrefixes[ i ];
      animationstring = pfx + 'Animation';
      keyframeprefix = '-' + pfx.toLowerCase() + '-';
      animation = true;
      break;
    }
  }
}

module.exports = animation;
