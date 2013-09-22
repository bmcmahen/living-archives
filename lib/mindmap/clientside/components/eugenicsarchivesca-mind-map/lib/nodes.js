// Modules
var Emitter = require('emitter')
  , indexOf = require('indexof')
  , Tween = require('tween');

// Imports
var NodeView = require('./canvas').NodeView
  , Collection = require('./collection')
  , constants = require('./constants');

/////////////////////
// NODE COLLECTION //
/////////////////////

var NodeCollection = module.exports = function(context){
  this.models = [];
  this.obj = {};
  this.context = context;
};

// Inherit from Ordered Dictionary class to give us
// quick lookups and simplified loops.
NodeCollection.prototype = new Collection();
Emitter(NodeCollection.prototype);


NodeCollection.prototype.data = function(json, fn){
  this.context.animate();
  var keys = [], len = this.models.length;
  for (var i = 0, l = json.length; i < l; i++){
    var key = fn(json[i]);
    var model = this.get(key);
    keys.push(key);
    if (!model){
      var node = new NodeModel(json[i], this);
      node.setRandomPosition(i, json.length);
      this.add(node, key);
    }
  }

  // Remove any that might be missing...
  if (len){
    var models = this.models;
    while (len--){
      var m = models[len];
      if (indexOf(keys, m.attr._id) === -1){
        // this.emit('nodeRemoved', m);
        m.fadeOut = true;
      }
    }
  }
  return this;
};


NodeCollection.prototype.setForces = function(){
  this
    .setGravitationalForce()
    .addRepulsingForce();
};

// XXX Since we are always applying gravitational force
// and Repulsing force, it would be more efficient
// to do it in the same loop.

NodeCollection.prototype.setGravitationalForce = function(){
  var gravity = 0.005
    , gx = constants.CONTAINER_WIDTH / 2
    , gy = constants.CONTAINER_HEIGHT / 2;

   this.forEach(function(node, i){
    var dx = gx - node.x
      , dy = gy - node.y
      , angle = Math.atan2(dy, dx)
      , fx = Math.cos(angle) * gravity
      , fy = Math.sin(angle) * gravity;

    node.setForce(fx, fy);
   });

  return this;
};

NodeCollection.prototype.addRepulsingForce = function(){
  var minimumDistance = constants.MIN_DISTANCE
    , steepness = 9
    , nodes = this.models;

  for (var i = 0, len = nodes.length; i< len; i++) {
    for (var i2 = i + 1; i2 < len; i2++) {

      // Calculate normally distributed force.
      // this should take into account our width and height
      // such that we don't get overlapping elements.
      var node2 = nodes[i2]
        , node = nodes[i]
        , dx = node2.x - node.x
        , dy = node2.y - node.y
        , distance = Math.sqrt(dx * dx + dy * dy)
        , angle = Math.atan2(dy, dx)
        , repulsingforceY = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness))
        , repulsingforceX = 1 / (1 + Math.exp((distance / 130 - 1) * steepness))
        , fx = Math.cos(angle) * repulsingforceX
        , fy = Math.sin(angle) * repulsingforceY;

      // For simplicity, perhaps alter the minimum distance based on
      // the width of the element.

      node.addForce(-fx, -fy);
      node2.addForce(fx, fy);
    }
  }
};

NodeCollection.prototype.getOverlappingNode = function(x, y){
  var overlappingNode = false;
  this.forEach(function(node){
    if (node.isOverlappingWith(x, y)){
      overlappingNode = node;
      return;
    }
  });
  return overlappingNode;
};

NodeCollection.prototype.discreteStepNodes = function(dt){
  this.forEach(function(node){
    if (node) node.discreteStep(dt);
  });
};

NodeCollection.prototype.areMoving = function(){
  var moving = false;
  this.forEach(function(node){
    if (node.isMoving()) {
      moving = true;
      return;
    }
  });
  return moving;
};

NodeCollection.prototype.areLoading = function(){
  var loading = false;
  this.forEach(function(node){
    if (node.loading) {
      loading = true;
      return;
    }
  });
  return loading;
};


////////////////
// NODE MODEL //
////////////////

var NodeModel = function(attr, context){
  context.emit('nodeCreated', this);
  this.collection = context;
  this.attr = attr;

  // Load our image if we have one
  if (attr.image) {
    this.loading = true;
    this.type = 'image';
    var _this = this;
    this.loadImage(attr.image.url, function(img){
      _this.loading = false;
      _this.image = img;
    });
  } else {
    this.type = 'text';
    this.loading = false;
  }

  this.isSelected = false;
  this.links = [];
  this.opacity = 0.001;
  this.radius = constants.RADIUS;
  this.mass = 50; // kg
  this.fx = 0.0; // external force x
  this.fy = 0.0; // external force y
  this.vx = 0.0; // velocity x
  this.vy = 0.0; // velocity y
  this.minForce = constants.MIN_FORCE;
  this.minVelocity = constants.MIN_VELOCITY;
  this.damping = 0.9;

  this.type === 'image'
    ? this.setDimensions(85, 85)
    : this.setDimensions(130, 40);

  this.width = 145; // XXX our which should be dependent on width of text?
  this.height = 40;
  this.view = new NodeView(this);
  this.fadeIn = true;
  this.fadeOut = false;
  this.scale = 1.05;
  this.createFadeInTween();
};

NodeModel.prototype.setDimensions = function(w, h){
  this.width = w;
  this.height = h;
};

NodeModel.prototype.select = function(){
  this.isSelected = true;
  if (this.fadeIn){
    this.createFadeInTween({
      scale: this.scale,
      opacity: this.opacity
    }, {
      scale: 1.3,
      opacity: 1
    });
  } else {
    this.scale = 1.3;
  }
};

NodeModel.prototype.unselect = function(){
  this.isSelected = false;
   this.mouseOut = true;
};

NodeModel.prototype.createFadeInTween = function(source, target){
  var _this = this;
  source = source || { scale: 0.3, opacity: 0.001 };
  target = target || { scale: 1.05, opacity: 1.0 };

  this.fadeInTween = new Tween(source)
    .ease('in-out-cube')
    .to(target)
    .duration(600);

  this.fadeInTween.update(function(o){
    _this.scale = o.scale;
    _this.opacity = o.opacity;
  });

  this.fadeInTween.on('end', function(){
    _this.fadeIn = false;
    _this.scale = target.scale;
  });
};

NodeModel.prototype.createFadeOutTween = function(){
  var _this = this;
  this.fadeOutTween = new Tween({ scale: this.scale, opacity: 1.0})
    .ease('in-out-cube')
    .to({ scale: 0.3, opacity: 0.001 })
    .duration(600);

  this.fadeOutTween.update(function(o){
    _this.opacity = o.opacity;
    _this.scale = o.scale;
  });

  this.fadeOutTween.on('end', function(){
    _this.collection.remove(_this.attr._id);
  });
};


NodeModel.prototype.createHoverTween = function(hoverIn){
  var _this = this
    , from = hoverIn ? 1.05 : this.scale
    , to = hoverIn ? 1.3 : 1.05;

  this.hoverTween = new Tween({ scale: from })
    .to({ scale: to })
    .duration(100);

  this.hoverTween.update(function(o){
    _this.scale = o.scale;
  });

  this.hoverTween.on('end', function(){
    if (!hoverIn){
      _this.mouseOut = false;
      _this.triggeredHoverOut = false;
      _this.scale = 1.05;
    }
  });
};

NodeModel.prototype.createScaleTween = function(from, to, duration, type){
  var _this = this
    , dur = (duration || 100);

  this.scaleTween = new Tween({ scale : from })
    .to({ scale : to })
    .duration(dur);

  this.scaleTween.update(function(o){
    _this.scale = o.scale;
  });

  this.scaleTween.on('end', function(){
    if (type === 'hoverOut') {
      _this.mouseOut = false;
      _this.triggeredHoverOut = false;
      _this.scale = 1.05;
    }
  });
};

NodeModel.prototype.setRandomPosition = function(i, total){
  var radius = constants.LINK_LENGTH * 2
    , cx = constants.CONTAINER_WIDTH / 2
    , cy = constants.CONTAINER_HEIGHT / 2
    , angle = 2 * Math.PI * (i / total);

  if (! this.xFixed) this.x = cx + radius * Math.cos(angle);
  if (! this.yFixed) this.y = cy + radius * Math.sin(angle);
};

NodeModel.prototype.addLink = function(link){
  this.links.push(link);
  this.updateMass();
};

NodeModel.prototype.removeLink = function(link){
  var i = indexOf(this.links, link);
  if (i) this.links.splice(i, 1);
  this.updateMass();
};

NodeModel.prototype.updateMass = function(){
  this.mass = 80 * this.links.length;
};

NodeModel.prototype.setForce = function(fx, fy){
  this.fx = fx;
  this.fy = fy;
};

NodeModel.prototype.addForce = function(fx, fy){
  this.fx += fx;
  this.fy += fy;
};

NodeModel.prototype.discreteStep = function(dt){
  var interval = dt / 1000.0;

  // Handle fade-in and fade-out of elements when adding
  // or removing them dynamically from our collection.
  if (this.fadeIn) this.fadeInTween.update();
  if (this.fadeOut){
    if (!this.fadeOutTween) this.createFadeOutTween();
    this.fadeOutTween.update();
  }

  // Handle hover instances.
  // For simplicity, maybe just have two dif tweens for hoverIn
  // and hoverOut, b/c this seems to have some issues.
  if (!this.isSelected){
    if (this.mouseOver) {
      if (!this.triggeredHover) {
        this.triggeredHover = true;
        this.createHoverTween(true);
      }
      this.hoverTween.update();
    }
    if (this.mouseOut) {
      if (!this.triggeredHoverOut) {
        this.triggeredHoverOut = true;
        this.createScaleTween(1.3, 1.05, 100, 'hoverOut');
      }
      this.scaleTween.update();
    }
  }

  // x
  if (!this.xFixed) {
    var dx = -this.damping * this.vx; // damping force
    var ax = (this.fx + dx) / this.mass;
    this.vx += ax / interval;
    this.x += this.vx / interval;
  }

  // y
  if (!this.yFixed) {
    var dy = -this.damping * this.vy;
    var ay = (this.fy + dy) / this.mass;
    this.vy += ay / interval;
    this.y += this.vy / interval;
  }
};

NodeModel.prototype.distanceFrom = function(x, y){
  var dx = this.x - x
    , dy = this.y - y;
  return Math.sqrt(dx * dx + dy * hy);
};

NodeModel.prototype.isOverlappingWith = function(x, y){
  if (this.type === 'image'){
    return ((Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2)) < Math.pow(42.5, 2));
  }

  var left = this.x - this.width / 2
    , top = this.y - this.height / 2;

  return (
    x > left &&
    x < left + this.width &&
    y > top &&
    y < top + this.height
  );
};

NodeModel.prototype.isFixed = function(){
  return (this.xFixed && this.yFixed);
};

// return true if the velocity is below the minimum
// velocity constant.
NodeModel.prototype.isMoving = function(){
  // XXX Use Kinetic Energy
  return (Math.abs(this.vx) > this.minVelocity || Math.abs(this.vy) > this.minVelocity ||
    (!this.xFixed && Math.abs(this.fx) > this.minForce) ||
    (!this.yFixed && Math.abs(this.fy) > this.minForce));
};

NodeModel.prototype.loadImage = function(url, fn){
  var img = new Image();
  img.onload = function(){ fn(img); };
  img.src = url;
};