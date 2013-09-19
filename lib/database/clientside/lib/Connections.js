

// Modules
var Modal = require('modal')
	, bind = require('bind')
	, each = require('each')
	, dom = require('dom')
	, request = require('superagent')
	, Collection = require('collection')
	, events = require('events')
	, clone = require('clone');

// Import
var LinkModel = require('./Model').LinkModel;
var controller = require('./Controller');

// Create our Modal
var modal = Modal(document.getElementById('connections'), {
	animationIn: 'fadeInDown',
	animationOut: 'fadeOutUp'
});


var Connection = module.exports = function(model, fn){
	var attr = model.toJSON();
	this.connections = attr.value || [];

	this.callback = fn;
	this.$el = dom('#connections');
	this.$add = dom('a.add-connections');
	this.$cancel = dom('.cancel');
	this.$list = dom('#mindmap-nodes');
	this.$selectedList = dom('#selected-nodes');
	this.potentialNodes = new Collection();
	this.previousNodes = new Collection();
	this.selectedNodes = new Collection();
	this.linksToDelete = [];
	modal.show();
	this.fetchAll();
	this.bind();
};

Connection.prototype.bind = function(){
	this.addEvents = events(this.$add.get(), this);
	this.addEvents.bind('click', 'parseAndSave');

	this.cancelBinding = bind(this, this.close);
	this.$cancel.on('click', this.cancelBinding);
};

Connection.prototype.unbind = function(){
	this.addEvents.unbind();
	this.$cancel.off('click', this.cancelBinding);
};

Connection.prototype.close = function(){
	this.unbind();
	modal.hide();
	this.$selectedList.empty();
	this.$list.empty();
};

// XXX

Connection.prototype.fetchAll = function(){
	var _this = this
		, currentDocument = controller.selectedDocument;

	// Fetch potential connections
	if (currentDocument.isNew()){
		request('/api/relations/', function(req, res){
			_this.createListing(res.body).render();
		});

	// Fetch potential & current connections of selected doc
	} else {
		var _id = controller.selectedDocument._id();
		request('/api/relations/'+ _id, function(res){
			_this.createListing(res.body).render();
		});
	}
};


Connection.prototype.createListing = function(docs){
	var _this = this;

	// Create our potential connection views
	each(docs.potentialNodes, function(doc){
		var node = new PotentialNode(doc, _this);
		_this.potentialNodes.push(node);
	});

	// Create our current connection views
	each(docs.links, function(doc, i){
		var link = new LinkNode(new LinkModel(doc), _this);
		_this.selectedNodes.push(link);
	});

	return this;
};


Connection.prototype.render = function(){
	var _this = this;
	this.potentialNodes.each(function(view){
		_this.$list.append(view.render().$el);
	});

	this.selectedNodes.each(function(view){
		_this.$selectedList.append(view.render().$el);
	});
};



Connection.prototype.parseAndSave = function(){
	var json = this.selectedNodes.map(function(node){
		node.parse();
		return node.model.toJSON();
	}).value();
	this.close();
	this.callback(json);
};

/**
 * Convert a selected link to a potential node
 * @param  {LinkNode} linkView
 * @return {Connection}
 */

Connection.prototype.linkToNode = function(linkView){
	var model = linkView.model;
	linkView.close();

	this.selectedNodes.models = this.selectedNodes.reject(function(node){
		return node == linkView;
	}).value();

	var current = controller.selectedDocument;
	var attr;
	if (model.from()){
		attr = (current._id() === model.from()._id)
			? model.to()
			: model.from();
	} else {
		attr = model.to();
	}

	var view = new PotentialNode(attr, this);
	this.potentialNodes.push(view);
	this.$list.append(view.render().$el);
	return this;
};

/**
 * Convert a potential node to a selected link
 * @param  {PotentialNode} nodeView
 * @return {Connection}
 */

Connection.prototype.nodeToLink = function(nodeView){
	var attr = nodeView.attr
		, current = controller.selectedDocument;

	// remove our element
	nodeView.close();

	// remove from our potential nodes collection
	this.potentialNodes.models = this.potentialNodes.reject(function(node){
		return node == nodeView;
	}).value();

	// create a new link model & fill it with attributes
	var model = new LinkModel();
	model.to({ title: attr.title, _id: attr._id });

	// we can't set our title and _id on new documents because we haven't
	// yet saved our document to the server. We need to PUT or POST our
	// links when we save our document.
	if (current && current._id())
		model.from({ title: current.title(), _id: current._id() });

	model.strength(1);

	// create a new link view, and add it to our selected node list
	var view = new LinkNode(model, this);
	this.selectedNodes.push(view);
	this.$selectedList.append(view.render().$el);
	return this;
};




/**
 * Link View
 * @param  {LinkModel} model
 * @param  {Connection} context
 * @return {LinkNode}
 */

var LinkNode = function(model, context){
	this.model = model;
	this.context = context;
	this.$el = dom('<li></li>').addClass('clearfix');
	this.template = require('../templates/connection-select');

	var current = controller.selectedDocument;
	if (model.from()){
		this.attr = (current._id() === model.from()._id)
				? clone(model.to())
				: clone(model.from());
	} else {
		this.attr = clone(model.to());
	}
	this.attr.strength = model.strength();
};

LinkNode.prototype.render = function(){
	this.$el.html(this.template(this.attr));
	this.bind();
	return this;
};

// Sets the link strength to the selected number.
LinkNode.prototype.parse = function(){
	var select = this.$el.find('select').get()
		, val = dom(select.options[select.selectedIndex]).val();
	this.model.strength(val);
};

LinkNode.prototype.bind = function(){
	var remove = this.$el.find('.remove').get();
	this.events = events(remove, this);
	this.events.bind('click', 'removeLink');
};

LinkNode.prototype.removeLink = function(e){
	e.preventDefault();
	this.context.linkToNode(this);
};

LinkNode.prototype.close = function(e){
	this.events.unbind();
	this.$el.remove();
};


/**
 * Potential Connection View
 * @param  {object} attr    name & id
 * @param  {Connection} context
 * @return {PotentialNode}
 */

var PotentialNode = function(attr, context){
	this.context = context;
	this.attr = attr;
	this.$el = dom('<li></li>').addClass('clearfix');
	this.template = function(attr){
		return attr.title+'<button class="add btn btn-small">Add</button>';
	};
};

PotentialNode.prototype.render = function(){
	this.$el.html(this.template(this.attr));
	this.bind();
	return this;
};

PotentialNode.prototype.bind = function(){
	var add = this.$el.find('.add').get();
	this.events = events(add, this);
	this.events.bind('click', 'addConnection');
};

PotentialNode.prototype.addConnection = function(){
	this.context.nodeToLink(this);
};

PotentialNode.prototype.close = function(){
	this.events.unbind();
	this.$el.remove();
};



