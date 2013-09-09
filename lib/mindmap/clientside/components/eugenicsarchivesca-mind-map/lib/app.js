// Modules
var raf = require('raf')
  , Emitter = require('emitter')
  , bind = require('bind')
  , scrollTop = require('scrolltop')
  , EmitterManager = require('emitter-manager');

// Imports
var constants = require('./constants')
  , NodeCollection = require('./nodes')
  , LinkCollection = require('./links')
  , CanvasView = require('./canvas').CanvasView;


////////////////////////////////
// MindMap API and Controller //
////////////////////////////////

var MindMap = module.exports = function(container, nodes, links){
  if (!(this instanceof MindMap)) return new MindMap(container, nodes, links);
  if (!container) throw new TypeError('MindMap() requires a container element');

  this.container = container;

  // construct our Node Collection, adding data if it's
  // passed to the constructor.
  this.nodes = new NodeCollection(this);
  if (nodes) {
    this.nodes.data(nodes, function(attr){
      return attr._id;
    });
  }

  // construct our Link Collection, adding data if it's
  // passed to the constructor.
  this.links = new LinkCollection(this);
  if (links){
    this.links.data(links, function(attr){
      return attr._id;
    });
  }

  this.translation = { x : 0, y : 0 };
  this.scale = 1;
  this.animated = false;
  this.createView();
};

Emitter(MindMap.prototype);
EmitterManager(MindMap.prototype);

MindMap.prototype.createView = function(){
  // XXX This should be modularized so that other view types
  // could be used. Eg., DOM, WebGL, SVG.
  this.view = new CanvasView(this.container, this);
  this.bind();
  return this;
};

/**
 * Bind our view events to provide a layer of abstraction.
 * Our view is responsible for emitting mouseDown, mouseMove
 * and mouseUp events, whether from the DOM, Canvas, or WebGL.
 */

MindMap.prototype.bind = function(){
  this.listenTo(this.view, 'mouseDown', this.onMouseDown);
  this.listenTo(this.view, 'mouseMove', this.onMouseMove);
  this.listenTo(this.view, 'mouseUp', this.onMouseUp);
  this.listenTo(this.view, 'mouseWheel', this.onZoom);
};

/**
 * Set Mindmap Width & Height
 * @return {Mindmap}
 *
 * xxx - these aren't constants anymore...
 */

MindMap.prototype.width = function(width){
  constants.CONTAINER_WIDTH = width;
  this.emit('containerWidth', width);
  return this;
};

MindMap.prototype.height = function(height){
  constants.CONTAINER_HEIGHT = height;
  this.emit('containerHeight', height);
  return this;
};

/**
 * Select nodes or begin dragging.
 * @param  {mousePosition} x
 * @param  {mousePosition} y
 */

MindMap.prototype.onMouseDown = function(x, y){
  x = this.xToCanvas(this.xMousePosition(x));
  y = this.yToCanvas(this.yMousePosition(y));

  var clickedNode = this.nodes.getOverlappingNode(x, y);

  if (clickedNode){
    this.selectedNode = clickedNode;
    this.clickFlag = true;
    if (!this.animated) this.animate();
    this.view.bindDragging();
    this.dragging = true;
  }
};

/**
 * Handle dragging and hover events
 * @param  {mouseposition} x
 * @param  {mouseposition} y
 */

MindMap.prototype.onMouseMove = function(x, y){
  if (x && y){

    x = this.xToCanvas(this.xMousePosition(x));
    y = this.yToCanvas(this.yMousePosition(y));


    if (this.selectedNode && this.dragging){
      this.clickFlag = false;
      var node = this.selectedNode;
      node.xFixed = true;
      node.yFixed = true;
      node.x = x;
      node.y = y;

    } else {

      var hoverNode = this.nodes.getOverlappingNode(x, y);

      // Start hover-in animation
      if (hoverNode && !this.hoverNode) {
        this.animate();
        hoverNode.mouseOver = true;
        this.emit('hoverNode', hoverNode);
        this.hoverNode = hoverNode;

      // Start hover-out animation
      } else if (!hoverNode && this.hoverNode){
        this.animate();
        this.hoverNode.mouseOver = false;
        this.hoverNode.mouseOut = true;
        this.hoverNode.triggeredHover = false;
        this.emit('hoverOutNode', this.hoverNode);
        delete this.hoverNode;
      }
    }
  }
};

MindMap.prototype.onZoom = function(x, y, delta){
  this.animate();

  var zoom = delta / 10;
  if (delta < 0) zoom = zoom / (1 - zoom);

  var oldScale = this.scale;
  var newScale = oldScale * (1 + zoom);
  if (newScale < 0.01) newScale = 0.01;
  if (newScale > 10) newScale = 10;

  x = this.xMousePosition(x);
  y = this.yMousePosition(y);

  var translation = this.translation
    , scaleFrac = newScale / oldScale
    , tx = (1 - scaleFrac) * x + translation.x * scaleFrac
    , ty = (1 - scaleFrac) * y + translation.y * scaleFrac;

  this.scale = newScale;
  this.setTranslation(tx, ty);
};

/**
 * Select a node or stop dragging.
 */

MindMap.prototype.onMouseUp = function(){
  if (this.clickFlag){
    this.selectedNode.isSelected = true;
    this.emit('nodeSelected', this.selectedNode);
    this.dragging = false;
  } else {
    this.selectedNode.xFixed = false;
    this.selectedNode.yFixed = false;
    delete this.selectedNode;
  }
};


/**
 * Primary animation loop using requestAnimationFrame.
 * @return {MindMap}
 */

MindMap.prototype.animate = function(){
  if (!this.animated){
    var lastExecution = Date.now()
      , _this = this;

    this.animated = true;

    // Run our animation using requestAnimationFrame (& fallback)
    // until our movement has stopped. When interacting with the
    // nodes, we tell our mindmap to start running animations again.
    var runAnimation = function(){
      var now = Date.now()
        , dt = now - lastExecution;

      if (dt && dt > 10){
        _this.calculatePosition(dt);
        _this.redraw();
        lastExecution = Date.now();
      }
      if (_this.isMoving){
        raf(runAnimation);
      } else {
        _this.animated = false;
      }
    };

    // Check every second to see if our nodes are still moving
    // and if they aren't (over a certain velocity) then stop
    // running our animation.
    var determineIfMoving = function(){
      if (!_this.nodes.areMoving()){
        _this.isMoving = false;
        clearInterval(timeoutId);
      }
    };
    var timeoutId = setInterval(determineIfMoving, 1000);


    _this.isMoving = true;
    runAnimation();
  }
  return this;
};

MindMap.prototype.calculatePosition = function(dt){
  this.nodes.setForces();
  this.links.addLinkForce();
  this.nodes.discreteStepNodes(dt);
  this.links.discreteStepLinks(dt);
};

// XXX. redraw should be more generic, to make it pluggable with
// different views.
MindMap.prototype.redraw = function(){
  this.view.redraw();
};

MindMap.prototype.drawEntity = function(type, ctx){
  this[type].forEach(function(item){
    item.view.render(ctx);
  });
  return this;
};

MindMap.prototype.determineString = function(ctx){
  this.nodes.forEach(function(node){
    node.view.determineString(ctx);
  });
};

/**
 * Unselect a node by _id, and emits a 'nodeUnselected'
 * event unless silent argument is passed to the func.
 * @param  {String} nodeId
 * @param  {Boolean} silent
 */

MindMap.prototype.unselectNode = function(nodeId, silent){
  var node = this.nodes.get(nodeId);
  if (node){
    node.isSelected = false;
    delete this.selectedNode;
    if (!silent) this.emit('nodeUnselected', node);
  }
};


/**
 * Select a node by _id, and emits a 'nodeSelected' event unless
 * silent argument is passed to the function.
 * @param  {String} nodeId
 * @param  {Boolean} silent
 */

MindMap.prototype.selectNode = function(nodeId, silent){
  var node = this.nodes.get(nodeId);
  if (node){
    node.isSelected = true;
    this.selectedNode = node;
    if (!silent) this.emit('nodeSelected', this.selectedNode);
  }
};

/**
 * Our mouse position needs to be relative to dom node
 * offset position. So calculate the offset of our view.
 */

MindMap.prototype.determineOffset = function(){
  var pos = this.view.getOffset();
  this.top = pos.top - scrollTop();
  this.left = pos.left;
  return this;
};

/**
 * Supply our mouse x position taking into account
 * the offset of our DOM position.
 * @param  {x mouse coordinate, number} x
 * @return {number}
 */

MindMap.prototype.xMousePosition = function(x){
  if (!this.left) this.determineOffset();
  return x - this.left;
};

/**
 * Supply our mouse y position taking into account
 * the offset of our DOM position.
 * @param  {y mouse coordinate, number} y
 * @return {number}
 */

MindMap.prototype.yMousePosition = function(y){
  if (!this.top) this.determineOffset();
  return y - this.top;
};


/**
 * Change the x, y translation origin of our DOM node.
 * @param  {number} offsetX
 * @param  {number} offsetY
 */

MindMap.prototype.setTranslation = function(offsetX, offsetY){
  this.translation.x = offsetX;
  this.translation.y = offsetY;
};

MindMap.prototype.xToCanvas = function(x){
  return (x - this.translation.x) / this.scale;
};

MindMap.prototype.yToCanvas = function(y){
  return (y - this.translation.y) / this.scale;
};




