// MODULES
var Swipe = require('swipe')
  , Emitter = require('emitter')
  , typeOf = require('type')
  , bind = require('bind')
  , dom = require('dom')
  , events = require('event');

var Collection = require('./Collection')
  , EugenicsDocument = require('./Model').Document
  , BreadCrumbs = require('./BreadCrumbs');

// Load filepicker to handle image uploads
(function(){

  var filepickerLoadCallback = function(){
    filepicker.setKey('AjpxCz4j4QaeYHScaoB1Iz');
  };

  var filepickerErrorCallback = function(){
    console.log('Error loading Filepicker');
  };

  //Generate a script tag
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '//api.filepicker.io/v1/filepicker.js';
  script.onload = filepickerLoadCallback;
  script.onerror = filepickerErrorCallback;

  //Load the script tag
  var head = document.getElementsByTagName('head')[0];
  head.appendChild(script);

})();

//////////////////////////////////////////
// Basically our Controller / Main View //
//////////////////////////////////////////

var Controller = function(){
  this.swipeContainer = dom('#swipe-container');
  this.setDimensions();
  this.swipe = new Swipe(document.getElementById('swipe-container'));
  this.selectedList = dom('#primary-navigation').find('a.active');
  this.breadCrumbs = new BreadCrumbs();
  this.collection = new Collection();
  this.bind();
};

Emitter(Controller.prototype);

Controller.prototype.bind = function(){
  var _this = this;
  events.bind(window, 'resize', function(){
    _this.setDimensions();
    _this.swipe.refresh();
  });
  dom('a.category').on('click', bind(this, this.onCategorySelect));
  dom('a.prod').on('click', bind(this, this.onCategorySelect));
  dom('a.new-document').on('click', bind(this, this.onCategorySelect));
  this.breadCrumbs.on('click', function(i, name){
    if (i === 0) _this.goHome();
    else _this.swipe.show(i);
  });
};

Controller.prototype.setDimensions = function(){
  var w = this.swipeContainer.get().offsetWidth;
  var h = window.innerHeight - 120;
  dom('li.swipe-item').css({ width: w, height: h });
  dom('.swipe-content').css({ height: h - 45 });
  dom('#listing').css({ height: h - 45 - 42 });
  dom('#swipe').css({ height: h });
};

Controller.prototype.onCategorySelect = function(e){
  e.preventDefault();
  if (this.selectedLink)
    this.selectedLink.removeClass('active');

  var link = dom(e.currentTarget);
  this.selectedLink = link.addClass('active');
  var name = link.attr('data-name');

  if (link.hasClass('prod')) {
    this.viewDocuments('prods', name);
    this.collectionType = 'prods';
    this.collectionName = name;
  } else if (link.hasClass('category')) {
    this.viewDocuments('documents', name);
    this.collectionType = 'documents';
    this.collectionName = name;
  } else if (link.hasClass('new-document')) {
    this.createDocument();
  }
};

Controller.prototype.selectDocument = function(doc){
  this.selectedDocument = doc;
  this.emit('setDocument', doc);
};

Controller.prototype.viewDocuments = function(type, name){
  type = type || this.collectionType;
  name = name || this.collectionName;

  if (!name) return this.goHome();

  if (this.collectionType !== type || this.collectionName !== name){
    dom('#query').value('');
    this.collection
      .setUrl(type, name)
      .fetch();
  }
  this.swipe.show(1);
  this.breadCrumbs.add(name, 1);
  this.url(type + '/' + name);
};

Controller.prototype.findDocumentById = function(id){
  return this.collection.find(function(doc){
    var _id = doc.get('_id');
    return id === _id;
  });
};

Controller.prototype.viewDocument = function(id){
  var selectedDocument = this.findDocumentById(id);
  if (selectedDocument){
    this.selectedDocument = selectedDocument;
    this.swipe.show(2);
    this.emit('viewDocument', selectedDocument);
    this.breadCrumbs.add('View Document', 2);
    this.url('/view/'+ id);
  }
};

Controller.prototype.editDocument = function(id, shallow){
  var selectedDocument = this.findDocumentById(id);
  if (selectedDocument){
    this.selectedDocument = selectedDocument;
    this.emit('editDocument', selectedDocument);
    this.swipe.show(3);
    this.breadCrumbs.add('Edit');
    this.url('/view/'+id+'/edit');
  }
};

Controller.prototype.createDocument = function(){
  var newDoc = new EugenicsDocument({
    type: 'event',
    prods: []
  });
  this.selectedDocument = newDoc;
  this.emit('editDocument', newDoc);
  this.swipe.show(3);
  this.breadCrumbs.add('New Document', 1);
  this.url('/new');
};

Controller.prototype.goHome = function(){
  this.swipe.show(0);
  this.breadCrumbs.slice(0).render();
  this.url('/');
  if (this.selectedLink) this.selectedLink.removeClass('active');
  delete this.selectedLink;
};

Controller.prototype.url = function(url){
  // xxx todo router
};

var controller = new Controller();
module.exports = controller;
var DocumentList = require('./Document-list')(controller);
var DocumentSummary = require('./Document-summary')(controller);
var DocumentForms = require('./Document-forms')(controller);


