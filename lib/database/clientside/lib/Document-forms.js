// Modules
var confirmation = require('confirmation')
  , moment = require('moment')
  , dom = require('dom')
  , uniq = require('uniq')
  , each = require('each')
  , extend = require('extend')
  , events = require('events')
  , contains = require('contains')
  , type = require('type')
  , Collection = require('collection')
  , EmitterManager = require('emitter-manager')
  , clone = require('clone')
  , Model = require('model')
  , enumerable = require('enumerable')
  , bind = require('bind')
  , map = require('map')
  , Confirmation = require('confirmation-popover');

// Imports
var DocumentModel = require('./Model').Document
  , Schema = require('./Forms-schema')
  , Spinner = require('./Spinner');

 // Maps type field to pluralized form
var typeToParam = {
  'event' : 'events',
  'concept' : 'concepts',
  'person' : 'people',
  'place' : 'places',
  'publication' : 'publications'
};

var Connection = require('./Connections');
var controller = require('./Controller');

// Our Controller should now control the creation of new documents
// or the retrieval of existing documents. Both will share the 'editDocument'
// event, & the model itself will handle whether to POST or PUT it.
controller.on('editDocument', function(model){
  var form = new FormGenerator(model).generate();
});

/////////////////////////////////
// Form Generator / Controller //
/////////////////////////////////

var FormGenerator = function(model){
  this.model = model;
  this.el = dom('#form-wrapper');
};

FormGenerator.prototype.generate = function(){
  this.fields = new FieldCollection(this, this.model)
    .on('save', bind(this, this.saveModel))
    .generateFieldModels();

  var formView = new FormView(this.fields, this, false);
  this.el
    .empty()
    .append(formView.render().el);
};

FormGenerator.prototype.deleteDocument = function(){
  this.model.remove(function(err){
    controller.collection.fetch(function(){
      controller.viewDocuments();
    });
  });
};

FormGenerator.prototype.saveModel = function(json){
  var previousJSON = this.model.toJSON()
    , _this = this;

  // Unset any previous attributes that we might no longer
  // have in our document.


  each(previousJSON, function(key, val){
    if (! json[key] && key !== '_id' && key !== '__v' && key !== 'created_at'){
      _this.model.unset(key);
    }
  });

  this.model.set(json);

  // XXX Redraw our collection in case the altered
  // model belongs to it.
  // Once the model is saved, refetch our collection
  // and redraw our model to update our listing
  // for edge cases.

  controller.collection.emit('change');
  Spinner.show();
  this.model.save(function(err, res){
    Spinner.hide();
    controller.collection.fetch(function(){
      controller.viewDocuments();
    }, _this.model);
  });
};

var FormModel = Model('FormModel');

/////////////////
// Field Model //
/////////////////

var FieldModel = Model('Field')
  .attr('value')
  .attr('label')
  .attr('widget')
  .attr('name')
  .attr('loading')
  .attr('error')
  .validate(function(field){
    if (field.get('required')){
      var val = field.get('value');
      if (type(val) == 'undefined' || val === ''){
        field.error('This field is required');
        field.errors.push('required');
      } else {
        field.error('');
      }
    }
  });

//////////////////////
// Field Collection //
//////////////////////

var FieldCollection = function(ctx, model){
  this.context = ctx;
  this.documentModel = model || null;
  this.models = [];
};

FieldCollection.prototype = new Collection();

// Our field models will contains each field and its attribute.
FieldCollection.prototype.generateFieldModels = function(){
  var _this = this;
  var attr = this.documentModel.toJSON();
  this.type = attr.type;
  this.prods = attr.prods || [];

  var fields = this.determineFields(this.type, this.prods);

  each(fields, function(key, field){
    field.name = key;
    if (key === 'prods'){
      each(field.fields[0], function(k, p){
        p.value = contains(attr.prods, k) ? true : false;
        p.name = k;
      });
    } else if ((type(attr[key]) != 'undefined')){
      field.value = attr[key];
    }

    _this.add(new FieldModel(field));
  });

  return this;
};

// Based on the document type, and the number of prods it participates in
// calculate the required fields.
FieldCollection.prototype.determineFields = function(type, prods){
  var defaultFields = Schema.required()
    , toIterate = [];

  toIterate.push(type);

  each(prods, function(prod){
    toIterate.push(prod);
  });

  each(toIterate, function(required){
    if (Schema[required])
      extend(defaultFields, Schema[required]());
    each(defaultFields, function(field, name){
      field.name = name;
    });
  });

  return defaultFields;
};

/**
 * If we change our document type, we need to add and remove
 * the required fields for each doc type.
 * @param  {string} newType new document type name
 */

FieldCollection.prototype.alterTypes = function(newType){
  if (this.type === newType) return;
  var fields = this.determineFields(newType, this.prods);
  this.remove(this.fieldsToRemove(fields));
  this.add(this.fieldsToAdd(fields));
  this.type = newType;
};

/**
 * Change the prod value to boolean (checked or not)
 * @param  {string} prodName
 * @param  {boolean} remove   remove prod?
 */

FieldCollection.prototype.alterProdValue = function(prodName, remove){
  // find our Prods field model
  var model = this.select(function(doc){
    return doc.get('name') === 'prods';
  }).value()[0];

  // and change its value (Yoiks)
  model.get('fields')[0][prodName].value = remove ? true : false;
};

/**
 * Add a new prod to our document
 * @param  {string} prodName
 */

FieldCollection.prototype.addProd = function(prodName){
  this.alterProdValue(prodName);

  // Determine which fields to add
  var newProds = clone(this.prods);
  newProds.push(prodName);

  // Determine & add the (unique) new fields
  var fields = this.determineFields(this.type, newProds);
  this.add(this.fieldsToAdd(fields));
  this.prods = newProds;
};

/**
 * Remove a prod from our document
 * @param  {string} prodName
 */

FieldCollection.prototype.removeProd = function(prodName){
  this.alterProdValue(prodName, true);

  // Determine our new prod listing.
  var newProds = map(this.prods, function(prod){
    if (prod !== prodName) return prod;
  });

  // Determine & remove the (unique) old fields
  var fields = this.determineFields(this.type, newProds);
  this.remove(this.fieldsToRemove(fields));
  this.prods = newProds;
};


/**
 * Given a new object of fields, determine which fields to remove
 * from our current field collection.
 * @param  {object} newFields key/val object schema
 * @return {array}           array of fields to remove
 */

FieldCollection.prototype.fieldsToRemove = function(newFields){
  return this.filter(function(obj, i){
    if (! newFields[obj.get('name')])
      return true;
  }).value();
};

/**
 * Given a new object of fields, determine which fields should
 * be added to our current field collection.
 * @param  {object} newFields ke/val object schema
 * @return {array}           array of fields to add
 */

FieldCollection.prototype.fieldsToAdd = function(newFields){
  var _this = this, newProds = [];
  each(newFields, function(key, field){
    var contains = _this.any(function(model){
      return model.get('name') === key;
    });
    if (!contains){
      field.name = key;
      newProds.push(new FieldModel(field));
    }
  });
  return newProds;
};

/**
 * Save our fields
 */

FieldCollection.prototype.save = function(){
  var json = {};
  this.each(function(model){
    var val = model.get('value');
    if (val) {
      json[model.get('name')] = model.get('value');
    }
  });
  this.emit('save', json);
};

/**
 * Validate each of our models
 * @return {boolean} false if any models are invalid
 */

FieldCollection.prototype.isValid = function(){
  var isValid = true;
  this.each(function(model){
    if (!(model.isValid()))
      isValid = false;
  });
  return isValid;
};


///////////////
// Form View //
///////////////

var FormView = function(fields, ctx, isFormset){
  this.fields = fields;
  this.context = ctx;
  this.isFormset = isFormset || false;
  this.el = dom('<form></form>');
  this.bind();
  this.buildWidgets();
  this.children = new Collection();
};

EmitterManager(FormView.prototype);

FormView.prototype.bind = function(){
  this.listenTo(this.fields, 'add', this.addChild);
  this.listenTo(this.fields, 'remove', this.removeChild);

  if (this.events) this.events.unbind();

  this.events = events(this.el.get(0), this);
  this.events.bind('click .remove-form', 'removeFormElement');
  this.events.bind('change select', 'alterType');
  this.events.bind('click .prod', 'alterProds');

  if (!this.isFormset){
    this.events.bind('submit', 'saveForm');
  }
};

FormView.prototype.addChild = function(child){
  var view = new FieldView(child);
  this.children.push(view);
  var saveEl = this.el.find('#save-form').get()
    , viewEl = view.render().el.get();
  saveEl.parentNode.insertBefore(viewEl, saveEl);
};

FormView.prototype.removeChild = function(childModel){
  var newFieldSet = this.children
    .reject(function(fieldView){
      if (fieldView.model == childModel) {
        fieldView.close();
        return true;
      }
    }).value();

  this.children.reset(newFieldSet);
};

FormView.prototype.closeChildren = function(){
  this.children
    .each(function(view){
      view.close();
    })
    .clear();
};

FormView.prototype.close = function(){
  this.events.unbind();
  this.stopListening();
  if (this.children) this.closeChildren();
  this.el.remove();
};

/**
 * Remove a form element within a Formset
 * @param  {event} e click remove btn
 */

FormView.prototype.removeFormElement = function(e){
  e.preventDefault();
  this.fields.context.remove(this.context);
};

/**
 * Render our Form
 * @return {[type]} [description]
 */

FormView.prototype.render = function(){
  var _this = this;

  this.closeChildren();

  // Render and keep track of our field views.
  var childViews = this.fields.map(function(fieldModel){
    var view = (fieldModel.get('widget') === 'formset')
      ? new FormsetView(fieldModel)
      : new FieldView(fieldModel);
    _this.el.append(view.render().el);
    return view;
  }).value();

  this.children.reset(childViews);

  // if a formset, then append a 'remove' element
  // if not formset, append a submit button
  if (this.isFormset){
   this.el.append(this.$remove);
  } else {
   this.el.append(this.$save);
    // If our document isn't new, provide delete button.
    if (! this.context.model.isNew()) {
      this.el.append(this.$delete);
    }
  }

  return this;
};

FormView.prototype.buildWidgets = function(){
  if (this.isFormset){

    this.$remove = dom('<a>[Remove]</a>')
      .href('#')
      .addClass('remove-form');

  } else {
    this.$save = dom('<input>')
      .id('save-form')
      .attr('type', 'submit')
      .addClass('btn')
      .addClass('btn-primary')
      .value('Save');

    // If our document isn't new, provide delete button.
    if (! this.context.model.isNew()) {
      this.$delete = dom('<a>Delete</a>')
        .id('delete-form')
        .addClass('delete')
        .addClass('btn')
        .addClass('btn-danger');

      this.events.bind('click #delete-form', 'deleteDocument');
    }
  }
};


/**
 * Parse, validate, and save our form input.
 * @param  {event} e submit form
 */

FormView.prototype.saveForm = function(e){
  e.preventDefault();
  this.parse();
  if (this.fields.isValid()){
    this.fields.save();
  }
};

/**
 * Parse either our field or formset
 * @return {object} self
 */

FormView.prototype.parse = function(){
  this.children.each(function(fieldView){
    var widget = fieldView.model.get('widget');

    if (widget !== 'image' || widget !== 'button') {
      fieldView.model.value(fieldView.parse());
    }
  });
  return this;
};

/**
 * Event Handler: Alter our document type
 * @param  {event} e selectbox change
 */

FormView.prototype.alterType = function(e){
  var t = e.target
    , type = dom(t.options[t.selectedIndex]).val();

  this.fields.alterTypes(type.toLowerCase());
};

/**
 * Event Handler: Alter our Prods collection
 * @param  {event} e click checkbox
 */

FormView.prototype.alterProds = function(e){

  var checkbox = dom(e.target).find('input')
    , isChecked = checkbox.get().checked
    , name = checkbox.name();

  // for some reason the checked attribute is reversed...
  if (!isChecked) this.fields.addProd(name);
  else this.fields.removeProd(name);
};

/**
 * Event Handler: Delete Document Button
 * @param  {event} e click delete
 */

FormView.prototype.deleteDocument = function(e){
  e.preventDefault();
  var _this = this;
  var confirm = new Confirmation('This action cannot be undone.', 'Delete document?');
  confirm.focus('ok');
  confirm.ok('Delete Document');
  confirm.show(e.currentTarget, function(ok){
    if (ok) _this.context.deleteDocument();
  });
};


////////////////
// Field View //
////////////////

var FieldView = function(fieldModel, context){
  this.context = context;
  this.el = dom('<div></div>').addClass('form-field');
  this.model = fieldModel;
  this.widget = fieldModel.get('widget');
  this.attributes = fieldModel.toJSON();

  // xxx - should be defined in schema
  if (this.attributes.name === 'prods')
    this.el.addClass('prods');

  // add our classname if specified
  if (this.attributes.className){
    this.el.addClass(this.attributes.className);
  }

  this.bind();
};

EmitterManager(FieldView.prototype);

/**
 * Bind our model listening events
 */

FieldView.prototype.bind = function(){
  this.listenTo(this.model, 'change error', this.render);
  if (this.widget === 'image') this.listenTo(this.model, 'change', this.render);
  this.events = events(this.el.get(0), this);
};

/**
 * Render our widget using templates
 * @return {object} self
 */

FieldView.prototype.render = function(){
  var html = this.widget === 'formset'
    ? ''
    : this.widgetTemplates[this.widget]({
      object : this.model.toJSON()
    });

  this.el.html(html);

  if (this.widget === 'image'){
    var fp = this.el
      .find('#filepicker')
      .attr('type', 'filepicker')
      .get();
    this.events.bind('change #filepicker', 'uploadImage');
    filepicker.constructWidget(fp);
    this.events.bind('click #remove-image', 'removeImage');
  }

  if (this.widget === 'button'){
    this.events.bind('click button', 'selectConnection');
  }

  return this;
};

/**
 * Parse our field, depending on the widget type
 * @return {string or array} the value of the field
 */

FieldView.prototype.parse = function(){
  var widget = this.widget;

  if (widget === 'button' || widget === 'image'){
    return this.model.value();
  }

  inputEl = widget === 'textarea'
    ? this.el.find('textarea')
    : this.el.find('input[name]');

  // checkbox means prods
  if (widget === 'checkbox'){
    var checkedProds = [];
    inputEl.each(function(input){
      if (input.get().checked){
        checkedProds.push(input.name());
      }
    });

    return (checkedProds.length > 0) ? checkedProds : null;
  }

  // toggle refers to a single checkbox, with true or false state.
  if (widget === 'toggle') {
    return inputEl.get().checked ? true : false;
  }

  if (widget === 'select') {
    var select = this.el.find('select').get();
    return dom(select.options[select.selectedIndex])
      .val()
      .toLowerCase();
  }

  return inputEl.val();
};

FieldView.prototype.widgetTemplates = {
  'textarea' : require('../templates/textarea'),
  'text' : require('../templates/text'),
  'checkbox' : require('../templates/checkbox'),
  'select' : require('../templates/select'),
  'image' : require('../templates/image'),
  'button' : require('../templates/button'),
  'toggle' : require('../templates/toggle')
};

FieldView.prototype.close = function(){
  this.events.unbind();
  this.stopListening();
  this.el.remove();
};

FieldView.prototype.uploadImage = function(e){
  var image = e.fpfile
    , _this = this
    , currentImage = this.model.value();

  e.preventDefault();

  if (currentImage){
    filepicker.remove(currentImage);
    this.model.value(false);
  }
  this.model.loading(true);
  filepicker.stat(image, { width: true, height: true }, function(meta){
    image.metadata = meta;
    _this.model.loading(false);
    _this.model.value(image);
  });
};

FieldView.prototype.removeImage = function(e){
  e.preventDefault();
  filepicker.remove(this.model.get('value'));
  this.model.value('');
};

FieldView.prototype.selectConnection = function(e){
  e.preventDefault();
  var _this = this;
  var connection = new Connection(this.model, function(links){
    _this.model.set({ value : links });
    // if links, update our links value with the new array.
  });
};

//////////////////
// Formset View //
//////////////////

var FormsetView = function(model){
  this.model = model;
  this.views = [];
  this.el = dom('<div></div>')
    .addClass('formsetView')
    .addClass('well');
  this.buildWidgets();
  this.formCollection = new Collection();

  var fields = this.fields = model.get('fields');
  var _this = this;

  // WTF this is a mess. .. but it works.
  if (model.get('value')){
    each(model.get('value'), function(obj){
      _this.formCollection.add(new FormModel(fields));
    });
  }

  this.formCollection.each(function(form, i){
    var fieldCollection = new FieldCollection(_this, form);
    var json = clone(form.toJSON());

    each(json, function(attr, ind){
        var val = model.get('value')[i][attr.name];
        attr['value'] = val;
        fieldCollection.add(new FieldModel(attr));
    });

    var view = new FormView(fieldCollection, form, true);
    _this.views.push(view);
  });
};

FormsetView.prototype.buildWidgets = function(){
  this.$add = dom('<button></button>')
    .addClass('btn')
    .addClass('btn-small')
    .addClass('add-another')
    .text('Add New Citation');
};

FormsetView.prototype.bind = function(){
  this.$add.on('click', bind(this, this.addAnother));
};

FormsetView.prototype.render = function(){
  this.closeChildren();
  this.el.empty();

  var _this = this;
  each(this.views, function(view){
    _this.children.push(view);
    dom(view.render().el).appendTo(_this.el);
  });

  this.el.append(this.$add);
  this.bind();

  return this;
};

/**
 * Parse our formset & don't return empty or null values.
 * @return {array} formset fields and values
 */

FormsetView.prototype.parse = function(){
  var toReturn = [];

  each(this.views, function(formView){
    formView.parse();
    var formValues = {}, empty = true;

    formView.children.each(function(fieldView){
      var val = fieldView.model.get('value');
      if (val && val != ''){
        formValues[fieldView.model.get('name')] = val;
        empty = false;
      }
    });

    if (!empty) {
      toReturn.push(formValues);
    }
  });

  return (toReturn.length > 0) ? toReturn : null;
};

/**
 * Add another instance of our formset
 * @param  {event} e click add-another button
 */

FormsetView.prototype.addAnother = function(e){
  e.preventDefault();
  var newFields = map(this.fields, function(field){
    return clone(field);
  });

  var formModel = new FormModel(newFields);
  this.formCollection.add(formModel);

  var col = new FieldCollection(this, formModel);
  each(this.fields, function(field){
    col.add(new FieldModel(field));
  });

  var view = new FormView(col, formModel, true);
  this.views.push(view);
  var addAnother = this.el.find('button.add-another').get();

  var toInsert = view.render().el;

  addAnother.parentNode.insertBefore(toInsert.get(), addAnother);
};

FormsetView.prototype.closeChildren = function(){
  if (this.children){
    each(this.children, function(view){
      view.closeChildren();
    });
  }
  this.children = [];
};

FormsetView.prototype.remove = function(formModel){
  this.formCollection.remove(formModel);
  var newViews = [];
  each(this.views, function(view){
    if (view.context == formModel){
      view.close();
    } else {
      newViews.push(view);
    }
  });
  this.views = newViews;
};