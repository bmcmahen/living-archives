// Modules
var events = require('events')
  , Emitter = require('emitter')
  , EmitterManager = require('emitter-manager')
  , stringEllipsis = require('canvas-string-ellipsis')
  , roundedRect = require('rounded-rect')
  , classes = require('classes')
  , offset = require('offset')
  , pinch = require('pinch')
  , mouseleave = require('mouseleave')
  , scrollTop = require('scrolltop');

// Imports
var constants = require('./constants');
var loading = require('./loading');


// XXX If performance ever becomes an issue, consider
// (1) drawing all the text, (2) drawing all the rectangles
// (3) drawing all the links
// NodeView.prototype.renderText = function(ctx){
//   ctx.fillText(this.string, model.x, model.y);
// };


/////////////////////////
// PRIMARY CANVAS VIEW //
/////////////////////////

var CanvasView = exports.CanvasView = function(wrapper, context){
  this.context = context;
  var canvas = this.canvas = document.createElement('canvas');
  canvas.width = constants.CONTAINER_WIDTH;
  canvas.height = constants.CONTAINER_HEIGHT;
  wrapper.appendChild(canvas);

  // If Canvas isn't supported, let it be known...
  if (!this.canvas.getContext){
    var noCanvas = document.createElement('div');
    noCanvas.style.color = 'red';
    noCanvas.innerHTML = 'Your browser does not support this technology. Please upgrade.';
    wrapper.appendChild(noCanvas);
  }

  this.scale = window.devicePixelRatio || 1;
  this.originX = 0;
  this.originY = 0;


  this.events = events(canvas, this);
  this.events.bind('mousemove');
  this.events.bind('mousedown');
  this.events.bind('touchmove', 'onmousemove');
  this.events.bind('touchstart', 'onmousedown');
  this.events.bind('mousewheel');
  var self = this;
  window.onscroll = function(e){
    self.getOffset();
  }

  pinch(canvas, function(e){
    self.emit('pinch', e.x, e.y, e.scale);
  });

  mouseleave(canvas, function(e){
    self.emit('mouseleave');
  });

  this.listenTo(this.context, 'hoverNode', this.onHover);
  this.listenTo(this.context, 'hoverOutNode', this.onHover);
  this.listenTo(this.context, 'containerWidth', function(w){
    canvas.width = w;
    self.setContextConstants();
  });
  this.listenTo(this.context, 'loading', function(state){
    self.loadingState = state;
  });
  this.listenTo(this.context, 'containerHeight', function(h){
    canvas.height = h;
    self.setContextConstants();
  });
  this.setContextConstants();
};

Emitter(CanvasView.prototype);
EmitterManager(CanvasView.prototype);

/**
 * On hover in / out, toggle 'hover-node' class.
 */

CanvasView.prototype.onHover = function(node){
  classes(this.canvas).toggle('hover-node');
};


/**
 * Set constant context attributes only once
 * for efficiency.
 */

CanvasView.prototype.setContextConstants = function(){
  var ctx = this.canvas.getContext('2d');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'black';
  ctx.font = 'bold 13px Arial';
};

/**
 * Redraw our canvas by clearing it on each step and
 * drawing our links and nodes. Links go first, to appear
 * behind the nodes.
 */

CanvasView.prototype.redraw = function(){
  var canvas = this.canvas
    , ctx = canvas.getContext('2d')
    , w = constants.CONTAINER_WIDTH
    , h = constants.CONTAINER_HEIGHT;

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  var m = this.context;

  ctx.translate(m.translation.x, m.translation.y);
  ctx.scale(m.scale, m.scale);

  if (this.loadingState){
    loading(ctx);
  } else {

  // ideally, our view shouldn't know about our collections.
  this.context
    .drawEntity('links', ctx)
    .drawEntity('nodes', ctx);
  }

  ctx.restore();
};

/**
 * Get the offset of our canvas within the window.
 * @return {[object]}
 */

CanvasView.prototype.getOffset = function(){
  var position = offset(this.canvas);
  this.top = position.top - scrollTop();
  this.left = position.left;
  return position;
};

CanvasView.prototype.bindDragging = function(e){
  this.events.bind('mouseup');
  this.events.bind('touchend', 'onmouseup');
};

CanvasView.prototype.xPosition = function(x){
  if (!this.left) this.getOffset();
  return x - this.left;
};

CanvasView.prototype.yPosition = function(y){
  if (!this.top) this.getOffset();
  return y - this.top;
};

CanvasView.prototype.mousePoints = function(e){
  e.preventDefault();
  var touches = e.changedTouches;
  if (e.touches && e.touches.length > 1) {
    return false;
  }
  var point = touches ? touches[0] : e;
  return {
    x: this.xPosition(point.clientX),
    y: this.yPosition(point.clientY)
  };
}

CanvasView.prototype.onmousedown = function(e){
  var points = this.mousePoints(e);
  if (!points) return;
  this.emit('mouseDown', points.x, points.y);
};

CanvasView.prototype.onmousemove = function(e){
  var points = this.mousePoints(e);
  this.emit('mouseMove', points.x, points.y);
};

CanvasView.prototype.onmouseup = function(e){
  e.preventDefault();
  this.events.unbind('mouseup');
  this.events.unbind('touchend');
  this.emit('mouseUp');
};

// also support pinch on mobile.
CanvasView.prototype.onmousewheel = function(e){
  e = event || window.event;
  e.preventDefault();
  var ctx = this.canvas.getContext('2d');
  if (!this.left) this.getOffset();

  var mouseX = this.xPosition(e.clientX);
  var mouseY = this.yPosition(e.clientY);

  var delta = 0;
  if (e.wheelDelta) delta = e.wheelDelta / 120;
  else if (e.detail) delta = -e.detail/3;

  this.emit('mouseWheel', mouseX, mouseY, delta);
};




///////////////
// Link View //
///////////////

var LinkView = function(model){
  this.model = model;
};

exports.LinkView = LinkView;

/**
 * Render each link based on the model attributes.
 * @param  {canvas2dContext} ctx
 */

LinkView.prototype.render = function(ctx){
  var m = this.model;
  ctx.strokeStyle = 'rgba(34, 43, 156,'+ m.opacity +')';
  ctx.lineWidth = m.strength;
  ctx.beginPath();
  ctx.moveTo(m.from.x, m.from.y);
  ctx.lineTo(m.to.x, m.to.y);
  ctx.stroke();
};



///////////////
// Node View //
///////////////

var NodeView = function(model){
  this.model = model;
  if (model.type === 'text') this.determineString();
};

exports.NodeView = NodeView;

/**
 * Determine what our truncated string is only once per node,
 * so that we don't need to do this on each discrete step.
 */

NodeView.prototype.determineString = function(){
  var canvas = document.createElement('canvas')
    , tempCtx = canvas.getContext('2d')
    , maxWidth = 275;

  tempCtx.font = 'bold 13px Arial';
  var width = tempCtx.measureText(this.model.attr.title).width + 25;
  // if our width is over our maxWidth, then bring in the string ellipsis.

  if (width > maxWidth) {
    this.model.width = maxWidth;
    this.string = stringEllipsis(tempCtx, this.model.attr.title, maxWidth - 15);
  } else {
    this.model.width = width;
    this.string = this.model.attr.title;
  }
};

/**
 * Render our node based on the model attributes.
 * @param  {Canvas2dContext} ctx
 */

NodeView.prototype.render = function(ctx){
  var model = this.model
    , left =  -model.width / 2
    , top = -model.height / 2;

  if (model.type === 'image'){

    ctx.save();
    ctx.translate(model.x, model.y);
    ctx.scale(model.scale, model.scale);

    ctx.save();

    //draw a circle
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI*2, true);
    ctx.lineWidth = 5;
    ctx.globalAlpha = model.opacity || 0;
    if (model.isSelected){
      ctx.strokeStyle = '#00a10f';
    }
    ctx.stroke();
    if (model.loading) {
      ctx.fillStyle = '#ddd';
    }
    ctx.fill();
    ctx.closePath();
    ctx.clip();

    if (model.loading){
      this.loadingAnimation(ctx);
    }

    // Draw our image
    if (!model.loading){
      ctx.drawImage(model.image, -42.5, -42.5, 85, 85);
    }
    ctx.restore();

    // Show the title of the image on hover.
    // Should we just always show it if using touch?
    if (model.mouseOver && model.attr.title){
      ctx.fillStyle = 'black';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(model.attr.title, 0, 55);

    }
    ctx.restore();

  } else {

  // Rectangle Line Style
  ctx.lineWidth = 3;
  var opacity = model.opacity || 0;
  if (model.isSelected) ctx.fillStyle = '#777';
  else if (model.isActive) ctx.fillStyle = '#ddd';
  else ctx.fillStyle = 'rgba(255, 255, 255,'+ opacity +')';
  ctx.strokeStyle = 'rgba(20, 20, 20,'+ opacity +')';

  ctx.save();
  ctx.translate(model.x, model.y);

  // Scale
  ctx.scale(model.scale, model.scale);

  // Rectangle
  roundedRect(ctx, left, top, model.width, model.height, model.radius);

  ctx.fill();

  // Our Rectangle Outline
  ctx.stroke();

  // Our Text
  if (model.attr.title){
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = model.isSelected
      ? 'rgba(255,255,255,'+model.opacity+')'
      : 'rgba(0,0,0,'+model.opacity+')';
    ctx.fillText(this.string, 0, 0);
  }

  ctx.restore();

}
};

// https://github.com/component/spinner/blob/master/index.js
// xxx use loading.js instead.
NodeView.prototype.loadingAnimation = function(ctx){
  this.speed = this.speed || 60;
  this.size = this.size || 30;
  this.percent = this.percent || 0;
  this.percent = (this.percent + this.speed / 36) % 100;
  ctx.save();
  ctx.translate(-15, -15);
  var percent = this.percent;
  var ratio = window.devicePixelRatio || 1;
  var size = this.size / ratio;
  var half = size / 2;
  var x = half;
  var y = half;
  var rad = half - 1;
  var angle = Math.PI * 2 * (percent / 100);
  var grad = ctx.createLinearGradient(
    half + Math.sin(Math.PI * 1.5 - angle) * half,
    half + Math.cos(Math.PI * 1.5 - angle) * half,
    half + Math.sin(Math.PI * 0.5 - angle) * half,
    half + Math.cos(Math.PI * 0.5 - angle) * half
  );

  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 1)');

  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, rad, angle - Math.PI, angle, false);
  ctx.stroke();

  // inner circle
  ctx.strokeStyle = 'rgba(0, 0, 0, .4)';
  ctx.beginPath();
  ctx.arc(x, y, rad - 1, 0, Math.PI * 2, true);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw an Image to the canvas
 * @param  {2d context} ctx
 * @param  {image} img
 */

NodeView.prototype.drawImage = function(ctx, img){
  ctx.save();

  // Draw our circular clipping path
  ctx.beginPath();
  ctx.arc(75, 75, 10, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  // Draw our image
  ctx.drawImage(img, this.model.x, this.model.y, 75, 75);

  ctx.restore();
}
