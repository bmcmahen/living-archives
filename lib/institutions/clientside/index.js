module.exports = function(){

  var Accordion = require('horizontal-accordion');
  var Overlay = require('overlay');
  var bind = require('bind');
  var $ = require('jquery');
  var _ = require('underscore');
  var Backbone = require('backbone');
  var events = require('events');
  var crossLink = require('cross-link');

  var SwipeView = require('./swipe-views');

  require('./leaflet-label');
  require('image-zoom');

  var Tip = require('tip');

  var Pamphlet = function(){
    this.accordion = new Accordion('#accordion-wrapper');
    this.$institutions = $('#institutions');
    this.$beingIn = $('#being-in');
    this.$residential = $('#residential-schools');
    this.$contemporary = $('#contemporary');
    this.$swipeContent = $('#swipe-content');
    this.bind();
  };

  // use component/events instead
  Pamphlet.prototype.bind = function(){
    this.accordion
      .on('active', bind(this, this.makeActive))
      .on('collapse', bind(this, this.makeInactive));
    this.$institutions
      .on('click', bind(this, this.showInstitutions));
    this.$beingIn
      .on('click', bind(this, this.showBeingIn));
    this.$residential
      .on('click', bind(this, this.showResidential));
  };

  Pamphlet.prototype.makeActive = function(pane){
    setTimeout(function(){
      $(pane.el)
        .addClass('rendered')
        .find('.accordion-active-content')
        .addClass('animated fadeInRight');
    }, 500);
  };

  Pamphlet.prototype.makeInactive = function(pane){
    $(pane.el).removeClass('rendered');
  };

  Pamphlet.prototype.closeView = function(){
    if (this.currentSwipe){
      this.currentSwipe.close();
      this.showing = false;
    }
    router.navigate('/discover/institutions/');
  };

  Pamphlet.prototype.showInstitutions = function(e){
    var _this = this;
    if (e) e.preventDefault();
    this.closeView();
    this.showing = 'institutions';
    this.$swipeContent.html(require('./templates/institutions'));
    Tip('a[title]', {auto: false});
    this.currentSwipe = new MapView(this);
    router.navigate('/discover/institutions/map/');
  };

  Pamphlet.prototype.showBeingIn = function(e){
    var _this = this;
    e.preventDefault();
    this.showing = 'institutionalization';
    this.$swipeContent.html(require('./templates/institutionalization'));
    this.currentSwipe = new SwipeView(this);
  };

  Pamphlet.prototype.showResidential = function(e){
    var _this = this;
    if (e) e.preventDefault();
    this.closeView();
    this.showing = 'residential';
    this.$swipeContent.html(require('./templates/institutions'));
    Tip('a[title]', {auto: false});
    this.currentSwipe = new MapView(this, { residential : true });
    router.navigate('/discover/institutions/residential/');
  };



  // MAP VIEW
  var MapView = function(context, options){
    options = options || {};
    this.residential = options.residential;
    this.context = context;
    this.$mapWrapper = $('#map-wrapper');
    this.$switch = $('#switch');
    var mapId = this.residential
      ? 'bmcmahen.map-cdmg2y3r'
      : 'bmcmahen.map-8vookjpl';
    this.map = new L.mapbox.map('map', mapId, {
      zoomControl: false,
      attributionControl: false
    });
    this.$zoomOut = $('<button id="zoom-out"></button>')
      .html('<i class="icon-zoom-out margin-right"></i> Show All')
      .addClass('zoom-out')
      .appendTo(this.$mapWrapper);
    this.$exit = $('button.exit');
    this.bind();
    this.subViews = [];
    this.createGreeting();
    this.fetch();
  };

  MapView.prototype.bind = function(){
    this.$exit.on('click', bind(this, this.onExit));
    this.$zoomOut.on('click', bind(this, this.showAll));
  };

  MapView.prototype.close = function(){
   $('#swipe-content').empty();
  }

  MapView.prototype.onExit = function(e){
    e.preventDefault();
    this.context.closeView();
  };

  MapView.prototype.createGreeting = function(){
    var json;
    if (this.residential){
      json = {
        title: 'Residential Schools',
        fullDescription: 'Some description of residential schools, with instructions.',
        latitude: 53.81049579707404,
        longitude: -107.02273530005431,
        zoom: 5,
        prods: []
      };
    } else {
      json = {
        title: 'Western Canadian Institutions',
        fullDescription: 'Institutions were an integral part of eugenics in Western Canada.  They were a well-used way of separating different people in society based on economics, background, gender, disability and “race.”  There were many institutions and residential schools that served this purpose in Western Canada. <p> Please click on the insitutions either using the map or the navigation below to learn more about each one.</p>',
        latitude: 53.81049579707404,
        longitude: -107.02273530005431,
        zoom: 5,
        prods: []
      };
    }
    var view = new InstitutionView(this, json, 0).render().show();
    this.subViews.push(view);
  };

  MapView.prototype.select = function(id){
    var self = this;
    this.fetch().done(function(){
      _.find(self.subViews, function(view){
        if (view._id === id) {
          view.show();
          self.$zoomOut.addClass('show');
          return true;
        }
      })
    });
  }

  MapView.prototype.showAll = function(e){
    if (e) e.preventDefault();
    if (this.subViews && this.currentlySelected != this.subViews[0]) {
      this.subViews[0].show();
      this.$zoomOut.removeClass('show');
      if (this.residential) router.navigate('/discover/institutions/residential');
      else router.navigate('/discover/institutions/map/');
    }
  };

  MapView.prototype.fetch = function(){
    var _this = this;
    var deferred = new $.Deferred();
    $.get('/api/prods/institutions', function(docs){
      _.each(docs, function(obj, i){
        if (obj.latitude && obj.longitude){
          if (_this.residential && obj.residentialSchool){
            _this.subViews.push(new InstitutionView(_this, obj, i + 1).render());
          } else if (!_this.residential && !obj.residentialSchool){
            _this.subViews.push(new InstitutionView(_this, obj, i + 1).render());
          }
        }
      });
      // updateCounter(0, _this.subViews.length - 1);
      deferred.resolve();
    });
    return deferred.promise();
  };


  // Each Institution has a content view, a button view, and
  // map features that are added to the map.
  var InstitutionView = function(context, json, i){
    this.context = context;
    this.map = context.map;
    this.json = json;
    this.zoom = json.zoom || 12;
    this.InstitutionTemplate = require('./templates/institution');
    this.ButtonTemplate = require('./templates/button');
    this._id = json._id;
    this.json.index = i;
    if (i !== 0) {
      this.appendIcon();
    }
  };

  InstitutionView.prototype.render = function(){
    this.$content = $(this.InstitutionTemplate(this.json));
    var clinks = crossLink(this.json, 'institutions');
    if (clinks){
      this.$content.find('#other-prods').append(clinks);
    }
    this.context.$mapWrapper.append(this.$content);
    if (this.json.image){
      var imageView = new InstitutionImage(this.json);
      this.$content.find('.images').append(imageView.render().$el);
    }
    return this;
  };

  InstitutionView.prototype.show = function(){
    var current = this.context.currentlySelected;
    if (current) {
      // If we are already in the view, we will zoom in further.
      if (current._id === this._id) {
        this.setMapView(+this.json.latitude, +this.json.longitude + 0.01, 15);
        return this;
      }
      current.hide();
    }
    // this.$button.addClass('active');
    this.$content.addClass('active fadeInRight');
    this.context.currentlySelected = this;
    this.setMapView();
    // updateCounter(this.json.index);
    if (this._id) {
      if (this.residential) router.navigate('/discover/institutions/residential'+ this._id);
      else router.navigate('/discover/institutions/map/'+ this._id);
      $('#zoom-out').addClass('show');
    }
    return this;
  };

  InstitutionView.prototype.hide = function(){
    // this.$button.removeClass('active');
    this.$content.removeClass('active fadeInRight');
    return this;
  };

  // Show icons in the bottom left corner.
  InstitutionView.prototype.setMapView = function(latitude, longitude, zoom){
    var lat = latitude || +this.json.latitude + 0.009
      , lng = longitude || +this.json.longitude + 0.07
      , z = zoom || this.zoom;

    this.map.setView([lat, lng], z);
  };

  InstitutionView.prototype.appendIcon = function(){
    this.marker = L.mapbox.marker.style({
      properties: {
        "marker-size":"small",
        "marker-color" : "#5b8dd3"
      }
    }, [this.json.latitude, this.json.longitude]);

    this.marker
      .on('click', bind(this, this.onIconClick))
      .bindLabel(this.json.title)
      .addTo(this.map);
  };

  InstitutionView.prototype.onIconClick = function(){
    this.show();
  };

  // INSTITUTION IMAGES
  var InstitutionImage = function(json){
    this.json = json;
    this.$el = $(document.createElement('div')).addClass('image');
  };

  InstitutionImage.prototype.render = function(){
    // Create Thumbnail
    this.$thumb = $(document.createElement('img'))
      .addClass('thumbnail')
      .attr('src', this.json.image.url + '/convert?w=125&h=100');

    // Create Full
    this.$full = $(document.createElement('img'))
      .addClass('full animated')
      .attr('src', this.json.image.url + '/convert?w=500&h=400');

    this.$el.append(this.$thumb, this.$full);
    this.bind();
    return this;
  };

  InstitutionImage.prototype.bind = function(){
    this.$thumb.hover(bind(this, this.toggleImage));
  };

  InstitutionImage.prototype.toggleImage = function(){
    this.$full.toggleClass('active fadeInLeft');
  };

  // INSTANTIATE OUR ACCORDION CLASS
  var myAccordion = new Pamphlet();

  var Router = Backbone.Router.extend({
    routes: {
      'discover/institutions/' : 'showPamphlet',
      'discover/institutions/map/' : 'showMap',
      'discover/institutions/map/:id' : 'showInstitution',
      'discover/institutions/residential/': 'showResidential',
      'discover/institutions/residential/:id' : 'showResidentialInstitution'
    },

    showPamphlet: function(){
      if (myAccordion.showing){ myAccordion.closeView(); }
    },

    showMap: function(){
      if (myAccordion.showing !== 'institutions'){
        myAccordion.showInstitutions();
      }
      myAccordion.currentSwipe.showAll();
    },

    showInstitution: function(id){
       if (myAccordion.showing !== 'institutions'){
        myAccordion.showInstitutions();
      }
      myAccordion.currentSwipe.select(id);
    },

    showResidential: function(){
      if (myAccordion.showing !== 'residential'){
        myAccordion.showResidential();
      }
      myAccordion.currentSwipe.showAll();
    },

    showResidentialInstitution: function(){
      if (myAccordion.showing !== 'residential'){
        myAccordion.showResidential();
        myAccordion.currentSwipe.select(id);
      }
    }
  });

  var router = new Router();
  Backbone.history.start({ pushState: true });




};