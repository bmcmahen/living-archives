/**
 * Module dependencies.
 */

var Tip = require('tip')
  , inherit = require('inherit')
  , domify = require('domify')
  , classes = require('classes')
  , query = require('query')
  , empty = require('empty')
  , html = require('html');

/**
 * Expose `Popover`.
 */

module.exports = Popover;

/**
 * Initialize a `Popover` with the given `content`
 * and optional `title`.
 *
 * @param {Mixed} content
 * @param {Mixed} title
 * @api public
 */

function Popover(content, title) {
  this.popover = domify(require('./template'))[0];
  Tip.call(this, this.popover);
  this.classname = 'popover';
  classes(this.el).add('popover');
  if (title) this.title(title);
  else this.hideTitle();
  this.content(content);
  if (Popover.effect) this.effect(Popover.effect);
}

/**
 * Inherits from `Tip.prototype`.
 */

inherit(Popover, Tip);

/**
 * Replace `content`.
 *
 * @param {Mixed} content
 * @return {Popover}
 * @api public
 */

Popover.prototype.content = function(content){
  html(query('.popover-content', this.popover), content);
  return this;
};

/**
 * Change `title`.
 *
 * @param {String} title
 * @return {Popover}
 * @api public
 */

Popover.prototype.title = function(title){
  html(query('.popover-title', this.popover), title);
  return this;
};

/**
 * Hide the title.
 *
 * @return {Popover}
 * @api private
 */

Popover.prototype.hideTitle = function(){
  var el = query('.popover-title', this.popover);
  el.parentNode.removeChild(el);
  return this;
};

