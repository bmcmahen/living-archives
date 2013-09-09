
// MODULES
var Cast = require('cast')
  , Emitter = require('emitter')
  , bind = require('bind')
  , type = require('type')
  , dom = require('dom')
  , debounce = require('debounce')
  , each = require('each')
  , select = require('select')
  , map = require('map');

// Imports
// var controller = require('./Controller');
var template = require('../templates/cast-item');
var spinner = require('./Spinner');

var typeToParam = {
  'event' : 'events',
  'concept' : 'concepts',
  'person' : 'people',
  'place' : 'places',
  'publication' : 'publications'
};

module.exports = function(controller){

// CAST LISTING
var CastListing = function(type){
  this.type = type || 'documents';
  this.fieldToSort = 'created';
  this.sortDirection = 1;
  this.cast = new Cast({
    wrapper: '#cast-wrapper',
    template: template,
    boxHeight: 41,
    paddingHeight: 5
  }).draw();
  this.query = dom('#query');
  this.bind();
};

Emitter(CastListing);

CastListing.prototype.bind = function(){
  this.query.on('keydown', debounce(bind(this, this.filter), 300));
  var _this = this;
  dom('.navbar-search').on('submit', function(e){
    e.preventDefault();
    _this.filter();
    return false;
  });
  this.cast.on('viewRendered', bind(this, this.onViewRendered));
};

CastListing.prototype.onViewRendered = function(view){
  dom(view.el).find('a.edit-btn').on('click', function(e){
    e.preventDefault();
    controller.editDocument(view.model.toJSON()._id);
  });

  dom(view.el).find('a.title').on('click', function(e){
    e.preventDefault();
    controller.viewDocument(view.model.toJSON()._id);
  });
};

CastListing.prototype.filter = function(e){
  var val = this.query.val();
  var re = new RegExp(val, 'i');
  var data = select(this.docs, function(attr){
    return re.test(attr.title);
  });
  this.data(data).sort().list();
};


CastListing.prototype.setTotal = function(len){
  this.totalDocs = len;
  dom('#total').text('Total Entries: '+ len);
};

CastListing.prototype.data = function(datas){
  var data;
  if (type(datas) == 'undefined'){
    data = [];
  } else {
    data = datas || this.docs;
  }

  this.cast.data(data, function(attr){
    return attr._id;
  });
  return this;
};

CastListing.prototype.list = function(){
  this.cast.list();
  return this;
};

CastListing.prototype.draw = function(){
  this.cast.draw();
  return this;
};

CastListing.prototype.sort = function(field, inverse){
  this.fieldToSort = field || this.fieldToSort;
  this.sortDirection = inverse || this.sortDirection;
  this.cast.sortBy(this.fieldToSort, this.sortDirection);
  return this;
};

// Sort Listing View - XXX Make this into a component
var SortView = function(context, type){
  this.context = context;
  this.type = type;
  this.sortWrapper = dom('#sort-wrapper');
  this.direction = 1;
  this.attr = [
    { val: 'created', name:'Date Created' },
    { val: 'modified', name: 'Last Modified' },
    { val: 'title', name:'Title (Alphabetical)'}
  ];
  if (this.type === 'events' || this.type === 'timeline'){
    this.attr.push({val: 'date', name: 'Date'});
  }
  this.render();
  this.bind();
};

SortView.prototype.render = function(){
  var el = this.el = dom(document.createElement('select'));

  var buildOption = function(val, name){
    return dom(document.createElement('option'))
      .attr('value', val)
      .text(name);
  };

  each(this.attr, function(item, i){
    el.append(buildOption(item.val, item.name));
  });

  var direction = this.directionEl = dom(document.createElement('a'));
  direction
    .href('#')
    .html('<i class="icon-chevron-down"></i>');

  this.sortWrapper
    .empty()
    .append(el);

  this.sortWrapper.append(direction);
  };

SortView.prototype.bind = function(){
  var _this = this;
  this.el.on('change', function(e){
    var t = e.currentTarget;
    var type = dom(t.options[t.selectedIndex]).val();
    _this.context.sort(type).list();
  });
  this.directionEl.on('click', function(e){
    e.preventDefault();
    var i = dom(e.currentTarget).find('i');
    if (_this.direction === 1){
      i.removeClass('icon-chevron-down').addClass('icon-chevron-up');
      _this.direction = -1;
      _this.context.sortDirection = -1;
      _this.context.sort().list();
    } else {
      i.removeClass('icon-chevron-up').addClass('icon-chevron-down');
      _this.direction = 1;
      _this.context.sortDirection = 1;
      _this.context.sort().list();
    }
  });
};



  var collection = controller.collection;

  collection.on('change', function(){
    var myCast = new CastListing().draw();
    myCast.type = controller.collectionType;
    myCast.name = controller.collectionName;

    var data = controller.collection.toJSON()
      , userModel = require('./Model').User
      , user = userModel && userModel.body;

    data = map(data, function(attr, i){
      attr.currentUser = user;
      return attr;
    });

    myCast.docs = data;
    myCast.fieldToSort = 'created';


    var c = myCast.cast;
    c.data(data, function(attr){
      return attr._id;
    });

    myCast.sort();

    c.list();

    myCast.setTotal(data.length);

    var sortView = new SortView(myCast, name);
  });

}

