// Search Box

var SelectBox = require('select');
var $ = require('jquery');
var _ = require('underscore');

var eugenicsMap = require('./controller').controller;

/**
 * Instantiate a new searchbox and
 * append it to the DOM.
 */

var search = SelectBox()
  .label('Search')
  .searchable()
  .on('search', search)
  .on('change', onchange);

$('#query').append(search.el);

/**
 * When a search term is entered, update our
 * list of options.
 * @param  {String} term
 */

function search(term){
  eugenicsMap.fetch(function(){

    // remove our previous options
    _.each(search.options, function(option){
      search.remove(option.name);
    });

    // Filter our documents
    var re = new RegExp(term, 'i');
    var filtered = [];
    var docs = eugenicsMap.docs;

    _.each(docs, function(doc){
      if (re.test(doc.title)) {
        filtered.push(doc);
        search.add(doc.title, doc);
      }
    });

    if (filtered[0]) {
      search.highlight(filtered[0].title);
    }
  });
}

/**
 * When our search result changes, update our
 * map.
 */

function onchange(){
  var selected = search.values()[0];
  if (!selected) return;
  eugenicsMap.selectNode(selected._id);
}