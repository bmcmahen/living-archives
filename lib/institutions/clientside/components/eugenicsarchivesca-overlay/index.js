/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , classes = require('classes');

/**
 * Expose `Overlay`.
 */

module.exports = Overlay;

/**
 * Initialize a new `Overlay`.
 *
 * @param {Object} options
 * @api public
 */

function Overlay(options) {
  if (!(this instanceof Overlay)) return new Overlay(options);
  options || (options = {});
  this.duration = options.duration || 300;
  this.id = options.id || 'overlay';
}

/**
 * Mixin 'Emitter'
 */

Emitter(Overlay.prototype);

/**
 * Show the overlay.
 *
 * Emits "show" event.
 *
 * @return {Overlay}
 * @api public
 */

Overlay.prototype.show = function(){
  if (this.el) return;
  this.el = document.createElement('div');
  this.el.className = 'hide';
  this.el.id = this.id;
  document.getElementsByTagName('body')[0].appendChild(this.el);
  this.emit('show');
  var self = this;
  setTimeout(function(){
    classes(self.el).remove('hide');
  }, 0);
  return this;
};

/**
 * Hide the overlay.
 *
 * Emits "hide" event.
 *
 * @return {Overlay}
 * @api public
 */

Overlay.prototype.hide = function(){
  this.emit('hide');
  return this.remove();
};

/**
 * Remove the overlay from the DOM
 * Emits 'close' event.
 */

Overlay.prototype.remove = function(){
  if (!this.el) return;
  var self = this;
  classes(this.el).add('hide');
  setTimeout(function(){
    self.emit('close');
    self.el.parentNode.removeChild(self.el);
    delete self.el;
  }, this.duration);
  return this;
};
