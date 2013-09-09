var Emitter = require('emitter')
  , bind = require('bind')
  , events = require('events')
  , classes = require('classes');


var Accordion = module.exports = function(selector){
  if (!(this instanceof Accordion)) return new Accordion(selector);
  if (!selector) throw new TypeError('Horizontal-Accordion() requires a wrapper element');
  this.el = document.querySelector(selector);
  var panes = this.el.querySelectorAll('.accordion-child');

  // Maintain a collection of child elements
  this.children = [];
  for (var i = 0; i < panes.length; i++) {
    this.children.push(new AccordionPane(this, panes[i]));
  }
  this.on('click', bind(this, this.onPaneClicked));
};

Emitter(Accordion.prototype);

Accordion.prototype.onPaneClicked = function(pane){
  if (this.selected) this.selected.removeActive();
  this.selected = pane;
  if (pane.isCollapsed) pane.removeCollapse();
  for (var i = 0; i < this.children.length; i++){
    var child = this.children[i];
    if (! child.isActive) child.collapse();
  }
};

// Each Accordion Pane
var AccordionPane = function(context, el){
  if (!(this instanceof AccordionPane)) return new AccordionPane(context, el);
  if (!el) throw new TypeError('AccordionPane() requires an element');
  this.el = el;
  this.context = context;
  this.bind();
};

Emitter(AccordionPane.prototype);

// Bind Events
AccordionPane.prototype.bind = function(){
  this.events = events(this.el, this);
  this.events.bind('click');
};

AccordionPane.prototype.onclick = function(e){
  if (!this.isActive){
    this.makeActive();
    this.context.emit('click', this);
  }
};

// Manage Classes
AccordionPane.prototype.removeActive = function(){
  this.isActive = false;
  classes(this.el).remove('active');
  this.context.emit('inactive', this);
};

AccordionPane.prototype.makeActive = function(){
  this.isActive = true;
  classes(this.el).add('active');
  this.context.emit('active', this);
};

AccordionPane.prototype.collapse = function(){
  this.isCollapsed = true;
  classes(this.el).add('collapsed');
  this.context.emit('collapse', this);
};

AccordionPane.prototype.removeCollapse = function(){
  this.isCollapsed = false;
  classes(this.el).remove('collapsed');
  this.context.emit('remove-collapse', this);
};