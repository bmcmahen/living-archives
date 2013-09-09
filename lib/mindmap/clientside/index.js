var MindMap = require('mindmap');
var Fullscreen = require('fullscreen');
var $ = require('jquery');
var _ = require('underscore');

// xxx note that jquery and underscore aren't being used
// as components, but as system-wide requirements. We assume
// that they are already loaded with their global vars
// exposed. Probably not the best idea, really.

var getUnique = function(arr){
  var u = {}, a = [];
  for(var i = 0, l = arr.length; i < l; ++i){
    if(u.hasOwnProperty(arr[i]._id)) {
       continue;
    }
    a.push(arr[i]);
    u[arr[i]._id] = 1;
 }
 return a;
}

var el = document.getElementById('mindmap');
var mymap = new MindMap(el);

var EugenicsMap = function(docs){
  this.docs = docs;
};

EugenicsMap.prototype.bind = function(){
  mymap.on('nodeSelected', _.bind(this.onNodeSelected, this));
  $('#fullscreenmode').on('click', function(e){
    e.preventDefault();
    Fullscreen(document.getElementById('app'));
  });

  Fullscreen.on('change', function(full){
    if (full){
      setTimeout(function(){
        mymap.width($('#mindmap').width());
      }, 200);
      mymap.height($(window).height());
      mymap.determineOffset();
      mymap.animate();
    } else {
      mymap.width($(el).width());
      mymap.height(600);
      mymap.determineOffset();
      mymap.animate();
    }
  });
};

EugenicsMap.prototype.selectRandom = function(){
  var random = this.docs[Math.floor(Math.random()*this.docs.length)];
  this.selectedNode = random;
  this.currentSideview = new SideView(random).render();
  // mymap.selectNode(random._id);
};

EugenicsMap.prototype.onNodeSelected = function(node){
  if (this.selectedNode) mymap.unselectNode(this.selectedNode._id);
  this.currentSideview = new SideView(node.attr).render();
  this.selectedNode = node.attr;
  this.determineNodes().determineLinks();
  this.draw();
};

EugenicsMap.prototype.determineNodes = function(){
  var links = this.selectedNode.connections;
  var self = this;
  this.connectedNodes = _.map(links, function(link){
    var _id = (link.from._id !== self.selectedNode._id)
      ? link.from._id
      : link.to._id;
    return self.get(_id);
  });
  return this;
};

// xxx this is pretty insane. there's a better way.
EugenicsMap.prototype.determineLinks = function(){
  this.links = _.clone(this.selectedNode.connections || []);
  var self = this;
  _.each(this.links, function(l){
    delete l.opacity;
  });

  var connections = _.chain(this.connectedNodes)
    .pluck('connections')
    .flatten()
    .uniq()
    .value();

  _.each(connections, function(link){
    var from = false;
    var to = false;
    _.each(self.connectedNodes, function(n){
      if (n._id === link.from._id) from = true;
      if (n._id === link.to._id) to = true;
    });
    if (from && to) {
      var contains = _.some(self.links, function(l){
        return l._id === link._id;
      });
      if (!contains){
        link.opacity = 0.1;
        self.links.push(link);
      }
    }
  });

  return this;
};

EugenicsMap.prototype.get = function(_id){
  return _.find(this.docs, function(doc){
    return doc._id === _id;
  });
};

EugenicsMap.prototype.draw = function(){
  this.connectedNodes.push(this.selectedNode);
  mymap.nodes.data(this.connectedNodes, function(attr){
    return attr._id;
  });

  mymap.links.data(this.links, function(attr){
    return attr._id;
  });

  return this;
};

var eugenicsMap;

$.get('/api/prods/mindmap', function(docs){
  eugenicsMap = new EugenicsMap(docs);
    mymap.width($('#mindmap').width());

  eugenicsMap.selectRandom();
  eugenicsMap
    .determineNodes()
    .determineLinks()
    .draw();

  mymap.selectNode(eugenicsMap.selectedNode._id, true);

  mymap.animate();
  eugenicsMap.bind();
});



//////////////////////////////////////
// Sideview to display node content //
//////////////////////////////////////

var linearConversion = require('linear-conversion');

var SideView = function(model){
  this.model = model;
  this.$el = $('#data');
  this.conversion = linearConversion([0, 10], [10, 30]);
  this.template = require('./template');
};

SideView.prototype.render = function(){
  var model = _.clone(this.model);
  model.links = this.getConnectedNodes();
  this.$el.html(this.template(model));
  this.$el.find('a.link').bind('click', _.bind(this.selectNode, this));
  return this;
};

SideView.prototype.selectNode = function(e){
  e.preventDefault();
  var _id = $(e.currentTarget).data('id');
  mymap.selectNode(_id);
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


