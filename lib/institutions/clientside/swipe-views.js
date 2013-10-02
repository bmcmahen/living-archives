
  // SWIPE VIEWS
  var Swipe = require('swipe');
  var $ = require('jquery');
  var _ = require('underscore');

  var SwipeView = function(context){
    this.context = context;
    this.$el = $('#swipe-container');
    this.swipe = new Swipe(this.$el[0]).duration(600);
    this.$container = $('#swipe-container');
    this.$items = this.$container.find('li');
    this.$list = this.$container.find('ul');
    this.$selected = $('#switch li.active').find('a');
    this.$continueButtons = $('.continue');
    this.$switchItems = $('.switch-item');
    this.$exit = $('a.exit');
    this.bind();
    this.setSize();
  };

  module.exports = SwipeView;

  SwipeView.prototype.setSize = function(){
    var w = this.$container.width();
    var h = $(window).height() - 145;
    this.$items.css({
      width: w + 'px',
      height: h + 'px'
    });
    this.$container.height(h);
    this.$list.height(h);
    this.swipe.refresh();
  };

  SwipeView.prototype.bind = function(){
    var _this = this;
    this.swipe.on('showing', bind(this, this.onShow));
    this.$switchItems.on('click', function(e){
      e.preventDefault();
      var i = $(e.currentTarget).text();
      _this.swipe.show(+i);
    });
    $(window).on('resize', bind(this, this.setSize));
    this.$exit.on('click', bind(this, this.onExit));
    $(window).on('keydown', function(e){
      if (e.which === 37) {
        _this.swipe.prev();
      } else if (e.which === 39) {
        _this.swipe.next();
      }
    });
    this.$continueButtons.on('click', function(){
      _this.swipe.next();
    });
  };

  SwipeView.prototype.onExit = function(e){
    e.preventDefault();
    this.context.overlay.hide();
    $(window).off('keydown');
    $('#swipe-content').html('');
  };

  SwipeView.prototype.onShow = function(i){
    if (this.$selected) {
      this.$selected.parent().removeClass('active');
    }
    this.$selected = $('#'+i);
    this.$selected.parent().addClass('active');
  };