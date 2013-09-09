var dom = require('dom')
  , each = require('each')
  , Emitter = require('emitter');

// BREAD CRUMBS -- Harder than it looks!
var BreadCrumbs = function(){
  this.el = dom('#bread');
  this.models = [];
  this.add('Home', 0);
};

Emitter(BreadCrumbs.prototype);

// Remove any of our models that are after the index
BreadCrumbs.prototype.slice = function(i){
  this.models = this.models.slice(0, i + 1);
  return this;
};

BreadCrumbs.prototype.render = function(){
  var _this = this;
  this.el.empty();
  each(this.models, function(model, i){
    _this.el.append(new BreadCrumbItem(_this, model, model.name, i).li);
  });
};

BreadCrumbs.prototype.add = function(name, i){
  i = i || this.models.length;
  this.models[i] = new BreadCrumbModel(name, i);
  this.slice(i);
  this.render();
};

// BREAD CRUMB MODEL
var BreadCrumbModel = function(name, i){
  this.name = name;
  this.i = i;
};

// BREAD CRUMB ITEM VIEW
var BreadCrumbItem = function(ctx, model, name, i){
  this.context = ctx;
  this.model = model;
  this.i = i;
  this.li = dom(document.createElement('li'));
  if (this.isLast()){
    this.li.addClass('active').text(name);
  } else {
    this.li.html('<a href="#">'+name+'</a><span class="divider"> / </span>');
  }
  var _this = this;
  this.bind();
};

BreadCrumbItem.prototype.isLast = function(){
 return this.context.models.length === (this.i + 1);
};

BreadCrumbItem.prototype.bind = function(){
  var _this = this;
  this.li.find('a').on('click', function(e){
    e.preventDefault();
    _this.context.emit('click', _this.i, _this.model);
    _this.context.slice(_this.i).render();
  });
};

module.exports = BreadCrumbs;
