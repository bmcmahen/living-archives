require('./controller');

// var MindMap = require('mindmap');
// var Fullscreen = require('fullscreen');
// var $ = require('jquery');
// var _ = require('underscore');
// var Backbone = require('backbone');
// var select = require('select');


// // // on search we need to clear our options,
// // // we should also do a debounced search.

// // function search(term){
// //   _.each(searchBox.options, function(opt){
// //     searchBox.remove(opt.name);
// //   });
// //   var re = new RegExp(term, 'i');
// //   var filtered = _.filter(eugenicsMap.docs, function(doc){
// //    return re.test(doc.title);
// //   });
// //   _.each(filtered, function(res){
// //     searchBox.add(res.title, res);
// //   });
// //   if (filtered[0]){
// //     searchBox.highlight(filtered[0].title);
// //   }
// // }

// // var searchBox = select()
// //   .label('Search the Mindmap')
// //   .searchable()
// //   .on('search', search)
// //   .on('change', function(select){
// //     var val = select.values()[0];
// //     eugenicsMap.selectNode(val._id);
// //     var toDeselect = eugenicsMap.selectedNode._id;
// //     initialBuild();
// //     if (toDeselect) {
// //       console.log('deselect!', toDeselect);
// //       mymap.deselectNode(toDeselect);
// //     }
// //     router.navigate('discover/mindmap/'+ val._id);

// //   });

// // $('#query').append(searchBox.el);



// var getUnique = function(arr){
//   var u = {}, a = [];
//   for(var i = 0, l = arr.length; i < l; ++i){
//     if(u.hasOwnProperty(arr[i]._id)) {
//        continue;
//     }
//     a.push(arr[i]);
//     u[arr[i]._id] = 1;
//  }
//  return a;
// }

// var el = document.getElementById('mindmap');
// var mymap = new MindMap(el);

// var EugenicsMap = function(docs){
//   this.docs = docs;
// };

// EugenicsMap.prototype.bind = function(){
//   mymap.on('nodeSelected', _.bind(this.onNodeSelected, this));
//   $('#fullscreenmode').on('click', function(e){
//     e.preventDefault();
//     Fullscreen(document.getElementById('app'));
//   });

//   Fullscreen.on('change', function(full){
//     if (full){
//       setTimeout(function(){
//         mymap.width($('#mindmap').width());
//       }, 200);
//       mymap.height($(window).height());
//       mymap.determineOffset();
//       mymap.animate();
//     } else {
//       mymap.width($(el).width());
//       mymap.height(600);
//       mymap.determineOffset();
//       mymap.animate();
//     }
//   });
// };

// EugenicsMap.prototype.selectRandom = function(){
//   var random = this.docs[Math.floor(Math.random()*this.docs.length)];
//   this.selectedNode = random;
//   this.currentSideview = new SideView(random).render();
//   // mymap.selectNode(random._id);
// };

// EugenicsMap.prototype.selectNode = function(id){
//   var node = _.find(this.docs, function(doc){
//     return doc._id === id;
//   });
//   this.selectedNode = node;
//   this.currentSideview = new SideView(node).render();
// };

// EugenicsMap.prototype.onNodeSelected = function(node){
//   router.navigate('discover/mindmap/'+ node.attr._id);
//   if (this.selectedNode && this.selectedNode != node) {
//     mymap.deselectNode(this.selectedNode._id);
//   }
//   this.currentSideview = new SideView(node.attr).render();
//   this.selectedNode = node.attr;
//   this.determineNodes().determineLinks();
//   this.draw();
// };

// EugenicsMap.prototype.determineNodes = function(){
//   var links = this.selectedNode.connections;
//   var self = this;
//   this.connectedNodes = _.map(links, function(link){
//     var _id = (link.from._id !== self.selectedNode._id)
//       ? link.from._id
//       : link.to._id;
//     return self.get(_id);
//   });

//   this.connectedNodes = _.compact(this.connectedNodes);

//   return this;
// };

// // xxx this is pretty insane. there's a better way.
// EugenicsMap.prototype.determineLinks = function(){
//   this.links = _.clone(this.selectedNode.connections || []);
//   var self = this;
//   _.each(this.links, function(l){
//     delete l.opacity;
//   });

//   var connections = _.chain(this.connectedNodes)
//     .pluck('connections')
//     .flatten()
//     .uniq()
//     .value();

//   _.each(connections, function(link){
//     var from = false;
//     var to = false;
//     _.each(self.connectedNodes, function(n){
//       if (n._id === link.from._id) from = true;
//       if (n._id === link.to._id) to = true;
//     });
//     if (from && to) {
//       var contains = _.some(self.links, function(l){
//         return l._id === link._id;
//       });
//       if (!contains){
//         link.opacity = 0.1;
//         self.links.push(link);
//       }
//     }
//   });

//   return this;
// };

// EugenicsMap.prototype.get = function(_id){
//   return _.find(this.docs, function(doc){
//     return doc._id === _id;
//   });
// };

// EugenicsMap.prototype.draw = function(){
//   this.connectedNodes.push(this.selectedNode);
//   mymap.nodes.data(this.connectedNodes, function(attr){
//     return attr._id;
//   });

//   mymap.links.data(this.links, function(attr){
//     return attr._id;
//   });

//   return this;
// };

// var eugenicsMap;

// function boot(fn){
//   $.get('/api/prods/mindmap', function(docs){
//     docs = _.map(docs, function(doc){
//       if (doc.image && doc.image.url) {
//         doc.image.url = doc.image.url + '/convert?w=100&h=100&fit=crop&align=faces';
//       }
//       return doc;
//     });
//     eugenicsMap = new EugenicsMap(docs);
//     mymap.width($('#mindmap').width());
//     fn();
//   });
// }



// ////////////
// // Search //
// ////////////

// // var lazySearch = _.debounce(search, 350);

// // function search(e){
// //   var val = $(e.currentTarget).val();
// //   var re = new RegExp(val, 'i');
// //   var filtered = _.filter(eugenicsMap.docs, function(doc){
// //    return re.test(doc.title);
// //   });
// //   if (filtered.length < 1) return;
// //   if (filtered[0] == eugenicsMap.selectedNode) return;
// //   eugenicsMap.selectNode(filtered[0]._id);
// //   initialBuild();
// // }

// // $('#query').on('input', lazySearch);



// //////////////////////////////////////
// // Sideview to display node content //
// //////////////////////////////////////

// var linearConversion = require('linear-conversion');

// var SideView = function(model){
//   this.model = model;
//   this.$el = $('#data');
//   this.conversion = linearConversion([0, 10], [10, 30]);
//   this.template = require('./template');
// };

// SideView.prototype.render = function(){
//   var model = _.clone(this.model);
//   model.links = this.getConnectedNodes();
//   this.$el.html(this.template(model));
//   this.$el.find('a.link').bind('click', _.bind(this.selectNode, this));
//   return this;
// };

// SideView.prototype.selectNode = function(e){
//   e.preventDefault();
//   var _id = $(e.currentTarget).data('id');
//   mymap.selectNode(_id);
// };

// SideView.prototype.getConnectedNodes = function(){
//   var self = this;
//   return _.chain(self.model.connections)
//     .map(function(conn){
//       var obj = {};
//       if (conn.from._id === self.model._id) _.extend(obj, conn.to);
//       else _.extend(obj, conn.from);
//       obj.size = self.conversion(conn.strength);
//       return obj;
//     })
//     .sortBy(function(conn){
//       return -conn.size;
//     })
//     .value();
// }


// function initialBuild(options){
//   options = options || {};
//   if (options.random) eugenicsMap.selectRandom();

//   eugenicsMap
//     .determineNodes()
//     .determineLinks()
//     .draw();

//   mymap.selectNode(eugenicsMap.selectedNode._id, true);

//   mymap.animate();
//   eugenicsMap.bind();
// }

// var Router = Backbone.Router.extend({
//   routes: {
//     'discover/mindmap' : 'random',
//     'discover/mindmap/' : 'random',
//     'discover/mindmap/:id' : 'select'
//   },
//   random: function(){
//     if (!eugenicsMap){
//       boot(function(){ initialBuild({ random: true }); });
//     }
//     else {
//       eugenicsMap.selectRandom();
//     }
//   },
//   select: function(id){
//     console.log('select', id);
//     if (!eugenicsMap) {
//       boot(function(){
//         eugenicsMap.selectNode(id);
//         initialBuild();
//         mymap.selectNode(id, true);
//       });
//     }
//   }
// });

// var router = new Router();
// Backbone.history.start({ pushState: true });


