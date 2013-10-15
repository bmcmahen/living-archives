
var Cast = require('cast');
var Modal = require('modal');
var $ = require('jquery');
var modalTemplate = require('./templates/modal-dialogue');
var cardViewTemplate = require('./templates/card-view');
var _ = require('underscore');
var tip = require('tip');
var Backbone = require('backbone');
var onload = require('onload');
var clink = require('cross-link');

var cast;

function boot(){
  var deferred = new $.Deferred();
  $.get('/api/prods/heroes-and-villains', function(data){
    data = _.map(data, function(item){
      var parts = item.title.split(',');
      item.first_name = parts[parts.length -1];
      item.last_name = parts[0];
      return item;
    });
    buildCast(data);
    deferred.resolve();
  });
  return deferred.promise();
}

module.exports = boot;

function buildCast(data){
 cast = new Cast({
    boxHeight: 260,
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
      if (!$view.hasClass('flip')){
        router.navigate('discover/heroes/'+view.model.attributes._id);
      }
      $view.toggleClass('flip');
    });
    $view.attr('id', view.model.attributes._id);
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
    var img = $view.find('img')[0];
    onload(img);
  })
  .on('viewDestroyed', function(view){
    $(view.el).off('click');
  })
  .draw();
}

var $modal = $('#hv-modal');
var modal = Modal($modal[0]).overlay();

function showModal(view){
  var $modalContent = $modal.find('#modal-content');
  var json = view.model.toJSON();
  console.log(json);
  $modalContent.html(modalTemplate(json));
  var crosslinks = clink(json, 'heroes');
  if (crosslinks) {
    $modalContent
      .append($('<h5>Cross-Links</h5>'))
      .append(crosslinks);
  }
  modal.show();
}


var $main = $('#main');
var $swipe = $('#navbar-swipe-container');

function setBodySize(){
  $main.height($(window).height() - $swipe.height());
  if (cast) cast.dynamic({ wrapper : '#flipcard-wrapper' });
}
$(window).on('resize', _.debounce(setBodySize, 100));
setBodySize();

/**
 * Router
 */

var Router = Backbone.Router.extend({
  routes: {
    'discover/heroes/:id' : 'showCard'
  },

  showCard: function(id){
    $.when(boot()).then(function(){
      var $card = $('#'+id);
      var $parent = $('#main');
      $parent.scrollTop($parent.scrollTop() + $card.position().top);
      $card.addClass('flip');
    });
  }
});

var router = new Router();
Backbone.history.start({ pushState: true });