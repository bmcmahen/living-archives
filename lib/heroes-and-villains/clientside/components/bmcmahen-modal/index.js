var Emitter = require('emitter');
var overlay = require('overlay');
var classes = require('classes');
var afterTransition = require('after-transition');
var events = require('events');
var delegate = require('delegate');
var prevent = require('prevent');
var target = require('target');
var attr = require('get-attribute');
var domify = require('domify');

/**
 * Bind any links with [data-modal-id]. _id should direct
 * us to the id of the modal dialog.
 */

var modalTrigger = delegate.bind(document, '[data-modal-id]', 'click', function(e){
  prevent(e);
  var el = target(e);
  var _id = attr(el, 'data-modal-id');
  var newModal = new Modal(document.getElementById(_id));
  if (attr(el, 'data-show-overlay')) newModal.overlay();
  newModal.show();
});

/**
 * API
 * @param  {Element} el
 * @return {Modal}
 */

module.exports = function(el){
  delegate.unbind(document, 'click', modalTrigger, false);
  return new Modal(el);
};

/**
 * Modal Constructor
 * @param {Element} el
 */

function Modal(el){
  this.el = el;
  this.isShown = false;
  this.bind();
}

Emitter(Modal.prototype);

Modal.prototype.toggle = function(){
  if (this.isShown) this.hide();
  else this.show();
  return this;
};

Modal.prototype.bind = function(){
  this.events = events(this.el, this);
  this.events.bind('click [data-modal-close]', 'hide');
};

Modal.prototype.overlay = function(className){
  this._overlay = overlay(className || 'modal-dialogue');
  return this;
};

Modal.prototype.show = function(){
  if (this.isShown) return this;
  this.previouslyFocused = document.activeElement;
  this.isShown = true;
  this.emit('showing');
  if (this._overlay) this._overlay.show();
  classes(this.el).add('modal-show');
  var self = this;
  afterTransition(this.el, function(){
    self.emit('shown');
  });
  this.el.focus();
  return this;
};

Modal.prototype.hide = function(e){
  if (e) prevent(e);
  if (!this.isShown) return this;
  this.emit('hiding');
  if (this._overlay) this._overlay.hide();
  classes(this.el).remove('modal-show');
  this.previouslyFocused.focus();
  this.isShown = false;
  var self = this;
  afterTransition(this.el, function(){
    self.emit('hidden');
  });
  return this;
};
