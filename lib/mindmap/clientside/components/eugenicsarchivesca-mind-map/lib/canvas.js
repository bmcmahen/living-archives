// Modules
var events = require('events')
  , Emitter = require('emitter')
  , EmitterManager = require('emitter-manager')
  , stringEllipsis = require('canvas-string-ellipsis')
  , roundedRect = require('rounded-rect')
  , bind = require('bind')
  , classes = require('classes')
  , offset = require('offset')
  , autoscale = require('autoscale-canvas');

// Imports
var constants = require('./constants');


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
  autoscale(canvas);
  wrapper.appendChild(canvas);

  // If Canvas isn't supported, let it be known...
  if (!this.canvas.getContext){
    var noCanvas = document.createElement('div');
    noCanvas.style.color = 'red';
    noCanvas.innerHTML = 'Your browser does not support Canvas.';
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
    self.context.determineOffset();
  }

  this.listenTo(this.context, 'hoverNode', this.onHover);
  this.listenTo(this.context, 'hoverOutNode', this.onHover);
  this.listenTo(this.context, 'containerWidth', function(w){
    canvas.width = w;
    autoscale(canvas);
    self.setContextConstants();
  });
  this.listenTo(this.context, 'containerHeight', function(h){
    canvas.height = h;
    autoscale(canvas);
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

  // ideally, our view shouldn't know about our collections.
  this.context
    .drawEntity('links', ctx)
    .drawEntity('nodes', ctx);

  ctx.restore();
};

/**
 * Get the offset of our canvas within the window.
 * @return {[object]}
 */

CanvasView.prototype.getOffset = function(){
  var position = offset(this.canvas);
  this.top = position.top;
  this.left = position.left;
  return position;
};

CanvasView.prototype.bindDragging = function(e){
  this.events.bind('mouseup');
  this.events.bind('touchend', 'onmouseup');
};

CanvasView.prototype.onmousedown = function(e){
  e.preventDefault();
  var touches = e.changedTouches;
  if (!touches) return this.emit('mouseDown', e.clientX, e.clientY);
  touches = touches[0];
  console.log(touches.pageX, touches.pageY);
  this.emit('mouseDown', touches.pageX, touches.pageY);
};

CanvasView.prototype.onmousemove = function(e){
  e.preventDefault();
  var touches = e.changedTouches;
  if (!touches) return this.emit('mouseMove', e.clientX, e.clientY);
  touches = touches[0];
  this.emit('mouseMove', touches.pageX, touches.pageY);
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
  var ctx = this.canvas.getContext('2d')

  var mouseX = e.clientX
    , mouseY = e.clientY;

  var delta = 0;
  if (e.wheelDelta){
    delta = e.wheelDelta / 120;
  } else if (e.detail) {
    delta = -e.detail/3;
  }

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
    , tempCtx = canvas.getContext('2d');

  tempCtx.font = 'bold 13px Arial';
  var width = tempCtx.measureText(this.model.attr.title).width;
  // if our width is over our maxWidth, then bring in the string ellipsis.

  this.model.width = width + 25;
  // this.string = this.model.attr.title;
  // this.string = stringEllipsis(tempCtx, this.model.attr.title, this.model.width - 15);
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
    if (model.image) {
      ctx.save();

      //draw a circle
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI*2, true);
      ctx.fill();
      ctx.closePath();
      ctx.clip();

      // Draw our image
      ctx.drawImage(model.image, -42.5, -42.5, 85, 85);
      // ctx.fillStyle = 'black';
      // roundedRect(ctx, -42.5, 100, 85, 30, 5);
      // ctx.fill();
      // ctx.strokeStyle = 'black';
      // ctx.stroke();

      ctx.restore();



    }
    ctx.restore();

  } else {

  // Rectangle Line Style
  ctx.lineWidth = 3;
  var opacity = model.opacity || 0;
  if (model.isSelected) ctx.fillStyle = '#777';
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
    ctx.fillText(model.attr.title, 0, 0);
  }

  ctx.restore();

}
};

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
