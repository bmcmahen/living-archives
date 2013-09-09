var Collection = require('collection')
  , request = require('superagent')
  , Emitter = require('emitter')
  , map = require('map')
  , type = require('type')
  , each = require('each');

var EugenicsDocument = require('./Model').Document;
var spinner = require('./Spinner');

// Extend our Collection to provide more backbone-like
// functionality.
Emitter(Collection.prototype);

// Replace all the docs
Collection.prototype.reset = function(models, silent){
  this.models = models;
  if (!silent) {
    this.emit('reset');
    this.emit('change');
  }
};

// Add a doc
Collection.prototype.add = function(model, silent){
  var _this = this;
  if (type(model) == 'array'){
    each(model, function(m){
      _this.add(m, silent);
    });
  } else {
    this.models.push(model);
    if (!silent) this.emit('add', model);
  }
};

// Remove a doc (by id)
Collection.prototype.remove = function(id, silent){
  var _this = this;
  var splice = function(i, m){
    if (i < 0) return;
    _this.models.splice(i, 1);
    _this.emit('remove', m);
  };

  var getIndex = function(model){
    splice(_this.indexOf(model), model);
  };

  if (type(id) == 'array'){
    each(id, function(obj){
     getIndex(obj);
    });
  } else if (type(id) == 'object') {
    getIndex(id);
  } else if (type(id) == 'string'){
    getIndex(this.find(function(m){
      return m._id === id;
    }));
  }

};

Collection.prototype.clear = function(){
  this.reset([]);
  return this;
};

/////////////////////////
// Document Collection //
/////////////////////////

var DocumentCollection = function(models){
  this.models = models || [];
};

DocumentCollection.prototype = new Collection();

// Set our URL based on the docType & name.
DocumentCollection.prototype.setUrl = function(docType, name){
  this.url = '/api/' + docType + '/' + name;
  return this;
};

// Fetch and populate given a URL.
DocumentCollection.prototype.fetch = function(fn, model){
  var _this = this;
  url = this.url;
  if (!url) {
    var controller = require('./Controller');
    return controller.goHome();
  }

  spinner.show();

  request.get(url, function(res){
    spinner.hide();
    if (res.body){
      var docs = map(res.body, function(doc){
        return new EugenicsDocument(doc);
      });
      _this.reset(docs);
      if (fn) fn();
    }
  });
};

// Give us a bare array, devoid of our models / DocumentCollections.
DocumentCollection.prototype.toJSON = function(){
  return this.map(function(doc){
    return doc.toJSON();
  }).value();
};

module.exports = DocumentCollection;