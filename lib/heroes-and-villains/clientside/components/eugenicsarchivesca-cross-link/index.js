var each = require('each');
var capitalize = require('capitalize');
var innerText = require('text');
var domify = require('domify');
var classes = require('classes');
var listTemplate = require('./list');

var urls = {
  'mindmap' : function(id) {
    return '/discover/mindmap/'+id;
  },
  'institutions' : function(id, obj) {
    if (obj.residentialSchool) return '/discover/mindmap/residential/'+id;
    else return '/discover/mindmap/map/'+id;
  },
  'timeline': function(id) {
    return '/discover/timeline/'+id;
  }
};

module.exports = function(obj, current){
  var prods = obj.prods;
  if (!prods) return false;
  if (prods.length < 1) return false;
  var $list = document.createElement('ul');
  classes($list).add('prod-links');
  each(prods, function(prod){
    if (prod === current) return;
    var $li = domify(listTemplate);
    var $a = $li.querySelector('a');
    var name = capitalize(prod);
    innerText($a, name);
    $a.href = urls[prod](obj._id, obj);
    $list.appendChild($li);
  });
  return $list;
};