/**
 * Modal Dialogue
 *
 */

var Emitter = require('emitter')
  , Overlay = require('overlay')
  , classes = require('classes')
  , animate = require('animate-css');

var Modal = function (el, options) {
  if (!(this instanceof Modal)) return new Modal(el, options);
  if (!el) throw new TypeError('Modal() requires an element.');
  this.el = el;
  options = options || {};
  this.animationIn = options.animationIn || 'fadeInDownBig';
  this.animationOut = options.animationOut || 'fadeOutUpBig';
  this.duration = options.duration || 800;
  this.isShown = false;
  this.overlay = new Overlay({duration: this.duration, id: options.overlayElementId || 'overlay'});
};

module.exports = Modal;

Emitter(Modal.prototype);

// Functions
Modal.prototype.toggle = function(){
  return this.isShown ? this.hide() : this.show();
};

// Apply our animation to show the Modal.
Modal.prototype.show = function(){
  if (this.isShown) return;
  this.isShown = true;
  this.emit('show');
  this.overlay.show();
  var cls = classes(this.el)
    , _this = this;

  cls.add('in');
  animate(this.el, this.animationIn, function(el){
    cls.remove(this.animationIn);
    _this.emit('modalIn');
  });

  this.el.focus();
  return this;
};

Modal.prototype.hide = function(){
  if (!this.isShown) return;
  this.emit('hide');
  this.overlay.hide();
  this.isShown = false;
  var _this = this;
  animate(this.el, this.animationOut, function(el){
    classes(_this.el).remove('in');
    _this.emit('modalOut');
  });
  return this;
};
