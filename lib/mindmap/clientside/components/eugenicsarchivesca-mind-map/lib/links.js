// Modules
var Emitter = require('emitter')
  , indexOf = require('indexof')
  , Tween = require('tween')
  , each = require('each')
  , linearConversion = require('linear-conversion');

// Imports
var LinkView = require('./canvas').LinkView
  , Collection = require('./collection')
  , constants = require('./constants');


// LINK COLLECTION ->
// We maintain both an array and object (with the _id as key)
// in order to optimize quick lookup, and fast enumeration. There is
// maintenance, but adding/removing is not the most performance
// critical part of the app.

var LinkCollection = module.exports = function(context){
  this.models = [];
  this.obj = {};
  this.nodes = context.nodes;
  this.context = context;
};

LinkCollection.prototype = new Collection();

LinkCollection.prototype.discreteStepLinks = function(dt){
  this.forEach(function(link){
    if (link) link.discreteStep(dt);
  });
};

LinkCollection.prototype.data = function(json, fn){
  this.context.animate();
  var keys = [], len = this.models.length;
  for (var i = 0, l = json.length; i < l; i++){
    var key = fn(json[i]);
    var model = this.get(key);
    keys.push(key);
    if (!model){
      this.addLink(json[i]);
    } else {
      var opacity = json[i].opacity || 1;
      model.setOpacity(opacity);
      model.attr = json[i];
    }
  }

  // Remove any that might be missing...
  if (len){
    var models = this.models;
    while (len--){
      var m = models[len];
      if (indexOf(keys, m.attr._id) === -1){
        m.fadeOut = true;
      }
    }
  }
  return this;
};


// Create our link model, and add it to the attached nodes.
LinkCollection.prototype.addLink = function(item){
  var nodes = this.nodes
    , from = nodes.get(item.from._id)
    , to = nodes.get(item.to._id);

  console.log(item);

  if (from && to){
      var linkModel = new LinkModel(item, from, to, this);
      from.addLink(linkModel);
      to.addLink(linkModel);
      this.add(linkModel, item._id);
    }

  return this;
};

// Remove our link model, and remove it from the attached nodes.
LinkCollection.prototype.removeLink = function(model, key){
  model.from.removeLink(model);
  model.to.removeLink(model);
  this.remove(key);
  return this;
};

LinkCollection.prototype.removeLinks = function(links){
  if (!links) return this;

  var _this = this;
  each(links, function(item, i){
    item.fadeOut = true;
  });

  return this;
};

// Each link has a spring force. The shorter the link -- and thus,
// the stronger the association -- the less spring, or more rigid
// the spring.
LinkCollection.prototype.addLinkForce = function(){
  this.forEach(function(link, i){
    var dx = (link.to.x - link.from.x)
      , dy = (link.to.y - link.from.y)
      , linkLength = link.len
      , length =  Math.sqrt(dx * dx + dy * dy)
      , angle = Math.atan2(dy, dx)
      , springforce = link.stiffness * (linkLength - length)
      , fx = Math.cos(angle) * springforce
      , fy = Math.sin(angle) * springforce;

    link.from.addForce(-fx, -fy);
    link.to.addForce(fx, fy);
    // If we wanted a bezier curve instead, calculate it here
    // link.calculateBezier();
  });
  return this;
};

// LINK MODEL
var LinkModel = function(attr, from, to, context){
  this._id = attr._id;
  this.strength = attr.strength;
  this.opacity = 0;
  this.targetOpacity = attr.opacity ? attr.opacity : 1;
  this.attr = attr;
  this.from = from;
  this.to = to;
  this.context = context;
  this.len = this.determineLength();
  this.stiffness = 0.05 / this.len;
  this.view = new LinkView(this);
  this.fadeIn = true;
  this.fadeOut = false;
  this.createFadeInTween();
};

LinkModel.prototype.setOpacity = function(opacity){
  this.targetOpacity = opacity;
  this.opacity = opacity;
};

LinkModel.prototype.discreteStep = function(dt){
  if (this.fadeIn) this.fadeInTween.update();
  if (this.fadeOut){
    if (!this.fadeOutTween) this.createFadeOutTween();
    this.fadeOutTween.update();
  }
};

LinkModel.prototype.createFadeInTween = function(){
  var _this = this;

  this.fadeInTween = new Tween({ opacity: 0.001 })
    .ease('in-out-cube')
    .to({ opacity: this.targetOpacity })
    .duration(1000);

  this.fadeInTween.update(function(o){
    _this.opacity = o.opacity;
  });

  this.fadeInTween.on('end', function(){ _this.fadeIn = false; });
};

LinkModel.prototype.createFadeOutTween = function(){
  var _this = this;
  this.fadeOutTween = new Tween({ opacity: this.targetOpacity})
    .ease('in-out-cube')
    .to({ opacity: 0.001 })
    .duration(200);

  this.fadeOutTween.update(function(o){
    _this.opacity = o.opacity;
  });

  this.fadeOutTween.on('end', function(){
    _this.context.removeLink(_this, _this.attr._id);
  });
};

LinkModel.prototype.determineLength = function(){
  var scale = linearConversion([0, 10], [constants.MAX_LINK_LENGTH, constants.MIN_LINK_LENGTH]);
  return scale(this.strength);
};

