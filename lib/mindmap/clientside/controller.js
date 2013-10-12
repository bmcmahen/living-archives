var MindMap = require('mindmap');
var Fullscreen = require('fullscreen');
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var EmitterManager = require('emitter-manager');

var wrapper = document.getElementById('mindmap');
var myMap = new MindMap(wrapper);
myMap.isLoading(true);
myMap.animate();
var CurrentSideView = require('./side-view');

exports.myMap = myMap;


function getUnique(arr){
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

var noop = function(){};

var EugenicsMap = function(){
  this.ready = false;
  this.callbacks = [];
  this.docs = [];
  this.bind();
};

EmitterManager(EugenicsMap.prototype);

EugenicsMap.prototype.bind = function(){
  this.listenTo(myMap, 'nodeSelected', this.onnodeselected);
  $('#fullscreenmode').on('click', function(e){
    e.preventDefault();
    if (Fullscreen.supported){
      Fullscreen(document.getElementById('app'));
    }
  });

  Fullscreen.on('change', function(full){
    if (full){
      setTimeout(function(){
        myMap.width($('#mindmap').width());
        myMap.height($(window).height());
        myMap.animate();
      }, 1000);
    } else {
      setTimeout(function(){
        setDimensions();
        myMap.animate();
      }, 1000);
    }
  });

};

EugenicsMap.prototype.findById = function(id){
  return _.find(this.docs, function(doc){
    return doc._id == id;
  });
};

EugenicsMap.prototype.selectNode = function(id, silent){
  if (this.selectedNode)  this.previousNode = this.selectedNode;
  this.selectedNode = this.findById(id);
  this.redraw();
};

EugenicsMap.prototype.selectRandom = function(){
  var random = this.docs[Math.floor(Math.random() * this.docs.length )];
  this.selectNode(random._id, true);
};

// If we want to programatically select a node, we should select
EugenicsMap.prototype.onnodeselected = function(node){
  router.navigate('discover/mindmap/'+ node.attr._id);
  if (this.selectedNode) myMap.deselectNode(this.selectedNode._id);
  this.selectedNode = node.attr;
  this.redraw();
};


EugenicsMap.prototype.redraw = function(){
  var node = this.selectedNode;
  if (this.currentSideView) this.currentSideView.close();
  this.currentSideView = new CurrentSideView(node).render();
  this
    .determineNodes()
    .determineLinks();

  this.connectedNodes.push(node);
  myMap.nodes.data(this.connectedNodes, function(attr){
    return attr._id;
  });
  myMap.links.data(this.links, function(attr){
    return attr._id;
  });
  myMap.selectNode(node._id, true);
  if (this.previousNode){
    myMap.deselectNode(this.previousNode._id);
    delete this.previousNode;
  }
  return this;
};

EugenicsMap.prototype.fetch = function(fn){
  fn = fn || noop;
  if (this.ready) return fn();
  this.callbacks.push(fn);
  if (this.fetching) return;
  this.fetching = true;
  var self = this;
  $.get('/api/prods/mindmap', function(docs){

    myMap.isLoading(false);

    // format our image url
    self.docs = _.map(docs, function(doc){
      if (doc.image && doc.image.url) {
        doc.image.original_url = doc.image.url;
        doc.image.url += '/convert?w=100&h=100&fit=crop&align=faces';
      }
      return doc;
    });

    self.ready = true;
    self.fetching = false;

    // call everyone back to say that we are ready
    _.each(self.callbacks, function(tocall){
      tocall();
    });
  });
};

EugenicsMap.prototype.determineNodes = function(){
  var links = this.selectedNode.connections;
  this.connectedNodes = [];
  _.each(links, function(link){
    var _id = (link.from._id !== this.selectedNode._id)
      ? link.from._id
      : link.to._id;
    var node = this.findById(_id);
    if (node) this.connectedNodes.push(node);
  }, this);
  return this;
};


EugenicsMap.prototype.determineLinks = function(){
  this.links = _.clone(this.selectedNode.connections || []);
    _.each(this.links, function(l){ delete l.opacity; });

  var connections = _.chain(this.connectedNodes)
    .pluck('connections')
    .flatten()
    .uniq()
    .value();

  var self = this;

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
}

function setDimensions(){
  var h = $(window).height() - $('#navbar-swipe-container').height();
  var w = $('#mindmap').width();
  $('#app').height(h);
  myMap.height(h);
  myMap.width(w);
  myMap.animate();
}

$(window).on('resize', _.debounce(setDimensions, 50));

function boot(options, fn){
  options = options || {};
  setDimensions();
  booted = true;
  eugenicsMap.fetch(function(){
    if (options.random) eugenicsMap.selectRandom();
    myMap.animate();
    if (fn) fn();
  });
}

var eugenicsMap = new EugenicsMap();
exports.controller = eugenicsMap;
var booted = false;
var Router = Backbone.Router.extend({
  routes: {
    'discover/mindmap' : 'random',
    'discover/mindmap/' : 'random',
    'discover/mindmap/:id' : 'select'
  },
  random: function(){
    if (!booted) boot({ random: true });
    else eugenicsMap.selectRandom();
  },
  select: function(id){
    if (!booted) {
      boot({}, function(){
        eugenicsMap.selectNode(id, true);
      });
    } else {
      eugenicsMap.selectNode(id, true);
    }
  }
});

var Search = require('./search');

var router = new Router();
Backbone.history.start({ pushState: true });