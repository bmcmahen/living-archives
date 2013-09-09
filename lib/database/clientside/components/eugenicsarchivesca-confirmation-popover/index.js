
/**
 * Module dependencies.
 */

var Popover = require('popover')
  , domify = require('domify')
  , query = require('query')
  , events = require('event')
  , bind = require('bind')
  , html = require('html');

/**
 * Expose `ConfirmationPopover`.
 */

module.exports = ConfirmationPopover;

/**
 * Initialize a `ConfirmationPopover` with the given `msg`
 * and optional `title`.
 *
 * @param {Mixed} msg
 * @param {Mixed} title
 * @api public
 */

function ConfirmationPopover(msg, title) {
  this.actions = domify(require('./template'))[0];
  Popover.call(this, this.actions, title);
  this.classname = 'popover confirmation-popover';

  var cancel = query('.cancel', this.actions);
  events.bind(cancel, 'click', bind(this, this.oncancel));

  var ok = query('.ok', this.actions);
  events.bind(ok, 'click', bind(this, this.onok));

  this.message(msg);
}

/**
 * Inherits from `Popover.prototype`.
 */

ConfirmationPopover.prototype.__proto__ = Popover.prototype;

/**
 * Handle cancel click.
 *
 * Emits "cancel".
 *
 * @param {Event} e
 * @api private
 */

ConfirmationPopover.prototype.oncancel = function(e){
  e.preventDefault();
  this.emit('cancel');
  this.callback(false);
  this.hide();
};

/**
 * Handle ok click.
 *
 * Emits "ok".
 *
 * @param {Event} e
 * @api private
 */

ConfirmationPopover.prototype.onok = function(e){
  e.preventDefault();
  this.emit('ok');
  this.callback(true);
  this.hide();
};

/**
 * Set confirmation `msg`.
 *
 * @param {String} msg
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.message = function(msg){
  html(query('.confirmation-popover-message', this.actions), msg);
  return this;
};

/**
 * Focus `type`, either "ok" or "cancel".
 *
 * @param {String} type
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.focus = function(type){
  this._focus = type;
  return this;
};

/**
 * Change "cancel" button `text`.
 *
 * @param {String} text
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.cancel = function(text){
  html(query('.cancel', this.actions), text);
  return this;
};

/**
 * Change "ok" button `text`.
 *
 * @param {String} text
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.ok = function(text){
  html(query('.ok', this.actions), text);
  return this;
};

/**
 * Show the tip attached to `el` and invoke `fn(ok)`.
 *
 * @param {Element} el
 * @param {Function} fn
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.show = function(el, fn){
  Popover.prototype.show.call(this, el);
  if (this._focus) query('.' + this._focus, this.el).focus();
  this.callback = fn || function(){};
  return this;
};
