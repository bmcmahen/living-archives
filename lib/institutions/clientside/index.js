module.exports = function(){

	// ACCORDION VIEW
	var Accordion = require('horizontal-accordion')
		, Overlay = require('overlay')
		, bind = require('bind');

	var $ = require('jquery');
	var _ = require('underscore');

	require('./leaflet-label');


	var Pamphlet = function(){
		this.accordion = new Accordion('#accordion-wrapper');
		this.overlay = new Overlay();
		this.$institutions = $('#institutions');
		this.$institutionalization = $('#institutionalization');
		this.$deinstitutionalization = $('#deinstitutionalization');
		this.$contemporary = $('#contemporary');
		this.$swipeContent = $('#swipe-content');
		this.bind();
	};

	Pamphlet.prototype.bind = function(){
		this.accordion
			.on('active', bind(this, this.makeActive))
			.on('collapse', bind(this, this.makeInactive));
		this.$institutions
			.on('click', bind(this, this.showInstitutions));
		this.$institutionalization
			.on('click', bind(this, this.showInstitutionalization));
		this.$deinstitutionalization
			.on('click', bind(this, this.showDeinstitutionalization));
		this.$contemporary
			.on('click', bind(this, this.showContemporary));
		this.overlay
			.on('show', this.toggleFullscreen)
			.on('hide', this.toggleFullscreen);
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

	Pamphlet.prototype.toggleFullscreen = function(){
		$('body').toggleClass('fullscreen');
	};

	Pamphlet.prototype.showInstitutions = function(e){
		var _this = this;
		e.preventDefault();
		this.overlay.show();
		$.get('/discover/institutions/places', function(data){
			_this.$swipeContent.html(data);
			_this.currentSwipe = new MapView(_this);
		});
	};

	Pamphlet.prototype.showInstitutionalization = function(e){
		var _this = this;
		e.preventDefault();
		this.overlay.show();
		$.get('/discover/institutions/institutionalization', function(data){
			_this.$swipeContent.html(data);
			_this.currentSwipe = new SwipeView(_this);
		});
	};

	Pamphlet.prototype.showDeinstitutionalization = function(e){
		var _this = this;
		e.preventDefault();
		this.overlay.show();
		$.get('/discover/institutions/deinstitutionalization', function(data){
			_this.$swipeContent.html(data);
			_this.currentSwipe = new SwipeView(_this);
		});
	};

	Pamphlet.prototype.showContemporary = function(e){
		var _this = this;
		e.preventDefault();
		this.overlay.show();
		$.get('/discover/institutions/contemporary', function(data){
			_this.$swipeContent.html(data);
			_this.currentSwipe = new SwipeView(_this);
		});
	};

	// MAP VIEW
	var MapView = function(context){
		this.context = context;
		this.$el = $('#swipe-container');
		this.$mapWrapper = $('#map-wrapper');
		this.$switch = $('#switch');
		this.map = new L.mapbox.map('map', 'bmcmahen.map-8vookjpl');
		this.$exit = $('a.exit');
		this.setSize();
		this.bind();
		this.subViews = [];
		this.createGreeting();
		this.fetch();
	};

	MapView.prototype.setSize = function(){
		var $windowHeight = $(window).height();
		this.$mapWrapper.height($windowHeight - 145);
		this.$mapWrapper.css('marginTop', 67 + 'px');
	};

	MapView.prototype.bind = function(){
		$(window).on('resize', bind(this, this.setSize));
		this.$exit.on('click', bind(this, this.onExit));
	};

	MapView.prototype.onExit = function(e){
		e.preventDefault();
		this.context.overlay.hide();
		$('#swipe-content').html('');
	};

	MapView.prototype.createGreeting = function(){
		var json = {
			title: 'Western Canadian Institutions',
			fullDescription: 'Institutions were an integral part of eugenics in Western Canada.  They were a well-used way of separating different people in society based on economics, background, gender, disability and “race.”  There were many institutions and residential schools that served this purpose in Western Canada. <p> Please click on the insitutions either using the map or the navigation below to learn more about each one.</p>',
			latitude: 53.81049579707404,
			longitude: -107.02273530005431,
			zoom: 5
		};
		var view = new InstitutionView(this, json, 0).render().show();
		this.subViews.push(view);
	};

	MapView.prototype.fetch = function(){
		var _this = this;
		$.get('/api/prods/institutions', function(docs){
			_.each(docs, function(obj, i){
				_this.subViews.push(new InstitutionView(_this, obj, i + 1).render());
			});
		});
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
		this.$button = $(this.ButtonTemplate(this.json));
		this.context.$mapWrapper.append(this.$content);
		this.context.$switch.append(this.$button);
		if (this.json.image){
			var imageView = new InstitutionImage(this.json);
			this.$content.find('.images').append(imageView.render().$el);
		}
		this.bind();
		return this;
	};

	InstitutionView.prototype.bind = function(){
		this.$button
			.find('a')
			.on('click', bind(this, this.show));
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
		this.$button.addClass('active');
		this.$content.addClass('active fadeInRight');
		this.context.currentlySelected = this;
		this.setMapView();
		return this;
	};

	InstitutionView.prototype.hide = function(){
		this.$button.removeClass('active');
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


	// SWIPE VIEWS
	var Swipe = require('swipe');

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


	// INSTANTIATE OUR ACCORDION CLASS
	var myAccordion = new Pamphlet();

};