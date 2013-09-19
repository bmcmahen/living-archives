var linearConversion = require('linear-conversion');
var $ = require('jquery');
var events = require('events');
var _ = require('underscore');

var myMap = require('./controller').myMap;


//////////////////////////////////////
// Sideview to display node content //
//////////////////////////////////////

var SideView = function(model){
  this.model = model;
  this.$el = $('#data');
  this.conversion = linearConversion([0, 10], [10, 30]);
  this.template = require('./template');
};

module.exports = SideView;

SideView.prototype.render = function(){
  var model = _.clone(this.model);
  model.links = this.getConnectedNodes();
  this.$el.html(this.template(model));
  this.events = events(this.$el.get(0), this);
  this.events.bind('click .link', 'selectNode');
  return this;
};

SideView.prototype.close = function(){
  this.events.unbind();
};

SideView.prototype.selectNode = function(e){
  e.preventDefault();
  var controller = require('./controller').controller;
  controller.selectNode($(e.target).data('id'));
};

SideView.prototype.getConnectedNodes = function(){
  var self = this;
  return _.chain(self.model.connections)
    .map(function(conn){
      var obj = {};
      if (conn.from._id === self.model._id) _.extend(obj, conn.to);
      else _.extend(obj, conn.from);
      obj.size = self.conversion(conn.strength);
      return obj;
    })
    .sortBy(function(conn){
      return -conn.size;
    })
    .value();
}
