var dom = require('dom')
	, extend = require('extend')
	, map = require('map')
	, clone = require('clone');

// Imports
var template = require('../templates/document-summary');

// Translate some of our attributes into nicer labels
var prodToFullName = {
	'heroes' : 'Heroes and Villains'
};

var typeToFullType = {
	'person' : 'Person or Group'
};

module.exports = function(controller){

///////////////////////////
// Document Summary View //
///////////////////////////

var DocumentView = function(){
	this.controller = controller;
	this.wrapper = dom('#document-summary');
	var self = this;
	controller.on('viewDocument', function(model){
		self.setModel(model);
		self.render(model);
	});
};

DocumentView.prototype.setModel = function(model){
	this.model = model;
	var _this = this;
	this.model.on('change', function(){
		_this.render(_this.model);
	});
};

DocumentView.prototype.render = function(){
	var json = clone(this.model.toJSON());

	// Make our prod names presentable. ie heroes -> Heroes and villains
	if (json.prods){
		json.prods = map(json.prods, function(prod, i){
			if (prodToFullName[prod])
				return prodToFullName[prod];
			return prod;
		});
	}

	var user = require('./Model').User;
	json.currentUser = user && user.body;

	if (typeToFullType[json.type])
		json.type = typeToFullType[json.type];


	// json.currentUser = currentUser;
	this.wrapper.html(template(json));
	this.bind();
};

DocumentView.prototype.bind = function(){
	var _this = this;
	dom('#edit-document').on('click', function(e){
		e.preventDefault();
		_this.controller.editDocument(_this.model._id());
	});
};

var view = new DocumentView();

};

// Instantiate our View, and listen for either:
// (1) When we have a new model
// (2) When our model changes





