
/**
 * Cast
 */

var Cast = require('cast');
var Modal = require('modal');
var $ = require('jquery');
var modalTemplate = require('./templates/modal-dialogue');
var cardViewTemplate = require('./templates/card-view');
var _ = require('underscore');
var tip = require('tip');
var Backbone = require('backbone');

var cast;

module.exports = function(){

  function showModal(view){
    var template = $('#modal-dialogue').html()
      , html = modalTemplate(view.model.toJSON())
      , $el = $(html);

    $('body').append($el);
    var model = new Modal($el[0], {
      animationIn: 'fadeInDown',
      animationOut: 'fadeOutUp'
    }).show();

    $el.find('.close').on('click', function(e){
      e.preventDefault();
      model.hide();
      setTimeout(function(){
        $el.remove();
      }, 1000);
    });
  }

  $(document).ready(function() {

  $.when( $.get('/api/prods/heroes-and-villains') ).then( function(data){

      data = _.map(data, function(item){
        var parts = item.title.split(',');
        item.first_name = parts[parts.length -1];
        item.last_name = parts[0];
        return item;
      });

      cast = new Cast({
        boxHeight: 280,
        boxWidth: 175,
        paddingWidth: 40,
        paddingHeight: 30,
        template: cardViewTemplate,
        wrapper: '#flipcard-wrapper'
      })
      .data(data, function(attr){
        return attr._id;
      })
      .sortBy('title')
      .on('wrapperHeight', function(h){
        $('.content').height(h);
      })
      .dynamic()
      .on('viewCreated', function(view){
        var $view = $(view.el);
        $view.on('click', function(){
          $view.toggleClass('flip');
        });
      })
      .on('viewRendered', function(view){
        var $view = $(view.el);
        $view.find('a.personInfo').on('click', function(e){
          e.preventDefault();
          e.stopImmediatePropagation();
          showModal(view);
        });
        var trigger = $view.find('.tooltip-trigger');
        tip(trigger);
      })
      .on('viewDestroyed', function(view){
        $(view.el).off('click');
      })
      .draw();


    // Filter our cards based on user input
    $('.filter').on('keyup', function(e){
      var query = $(e.currentTarget).val();
      var re = new RegExp(query, 'i');
      var filtered = _.filter(data, function(attr){
        return re.test(attr.title);
      });
      cast.data(filtered, function(attr){
        return attr._id;
      }).sortBy('title').justify();
    });

    /**
     * Enter full screen mode
     */

    $('#fullscreenmode').on('click', function(e){
      var $app = $('#app');
      var setWidth = function(){
        $('#flipcard-wrapper').width($('#app').width());
        cast.justify({wrapper: '#flipcard-wrapper'});
      };

      if ($app.hasClass('fullscreen')) {
        $(e.currentTarget).text('(Full Screen)');
        $app.removeClass('fullscreen');
        $('#modalbackdrop').removeClass('open');
        setWidth();
        $(window).off('resize');
      } else {
        $(e.currentTarget).text('(Exit Full Screen)');
        $app.addClass('fullscreen');
        $('#modalbackdrop').addClass('open');
        setWidth();
        $(window).on('resize', setWidth);
      }
  });

  });

  });

var $main = $('#main');
var $swipe = $('#navbar-swipe-container');
function setBodySize(){
  $main.height($(window).height() - $swipe.height());
  if (cast) cast.dynamic({ wrapper : '#flipcard-wrapper' });
}
$(window).on('resize', _.debounce(setBodySize, 100));
setBodySize();

};