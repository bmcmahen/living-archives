var Model = require('model')
  , request = require('superagent');


///////////////////////
// Eugenics Document //
///////////////////////

var EugenicsDocument = new Model('document')
  .attr('_id')
  .attr('title', { required: true, type: 'string'})
  .attr('fullDescription', { required: true, type: 'string'})
  .attr('created_at', { type: 'date' })
  .attr('created_by')
  .attr('modified_by')
  .attr('modified_at', { type: 'date' })
  .attr('type', { type: 'string'})
  .attr('prods')
  .attr('resources')
  .attr('image')
  .attr('date')
  .attr('dateOfBirth')
  .attr('dateOfDeath')
  .attr('alternativeName')
  .attr('location')
  .attr('yearOfPublication')
  .attr('monthOfPublication')
  .attr('author')
  .attr('publisher')
  .attr('startDate')
  .attr('endDate')
  .attr('heroQuote')
  .attr('heroQuoteSource')
  .attr('villainQuote')
  .attr('villainQuoteSource')
  .attr('ambiQuote')
  .attr('ambiQuoteSource')
  .attr('latitude')
  .attr('longitude')
  .attr('connections');

EugenicsDocument.prototype.unset = function(key){
	var _this = this;
	delete this.attrs[key];
};

EugenicsDocument.base = 'api/documents';
exports.Document = EugenicsDocument;

////////////////
// Link Model //
////////////////

var LinkModel = new Model('link')
  .attr('_id')
  .attr('from', { required : true })
  .attr('to', { required: true })
  .attr('strength', { required: true, type: 'number' });

LinkModel.base = 'api/links';
exports.LinkModel = LinkModel;


//////////////////
// Current User //
//////////////////

// Retrieve our current user for basic authentication.
// NOTE: this will only be used for display purposes. Anything
// that alters the DB is ultimately done on the server-side.
request('/api/user', function(user){
  exports.User = user;
});

