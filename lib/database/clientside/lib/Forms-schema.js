
// The field types that are required by each field type, and
// each prod. The app uses these to determine what fields
// are necessary to include, depending on the document type
// and the prods that it's part of.
var documentTypes = [
  {label: 'Event', name: 'event'},
  {label: 'Concept', name: 'concept'},
  {label: 'Person or Group', name: 'person'},
  {label: 'Place', name: 'place'},
  {label: 'Publication', name: 'publication'}
];


// Field Type Schemas
module.exports = {

  required : function() {
    return {
      title : { widget: 'text', label: 'Title', required: true },
      type : { widget: 'select', label: 'Document Type', options: documentTypes },
      fullDescription: {widget: 'textarea', label: 'Full Description', required: true},
      image: {widget: 'image', label: 'Image', className: 'image' },
      resources: {widget: 'formset', label: 'Citations', editable: true, fields : [{
        widget: 'textarea', name: 'resource', label: 'Citation', helpText: 'APA Format'
      }]},
      prods: {widget: 'checkbox', fields: [{
        timeline: {
          widget: 'checkbox', label: 'Timeline', value: ''
        },
        heroes: {
          widget: 'checkbox', label: 'Heroes and Villains', value: ''
        },
        institutions: {
          widget: 'checkbox', label: 'Institutions', value:''
        },
        mindmap: {
          widget: 'checkbox', label: 'Mind Map', value:''
        }
      }]}
    };
  },

  event : function() {
    return {
      date: { widget: 'text', label: 'Date', className:'date', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true }
    };
  },

  person : function() {
    return {
      dateOfBirth: { widget: 'text', label: 'Date of Birth / Formation', className: 'dateOfBirth', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true},
      dateOfDeath: { widget: 'text', label: 'Date of Death / Dissolution', className: 'dateOfDeath', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true}
    };
  },

  place: function() {
    return {
      alternativeNames : { widget: 'text', label: 'Alternative Names', helpText: 'Enter a comma-separated list of alternative place names.'},
      location: { widget: 'text', label: 'Location', helpText: 'City, Province'}
    };
  },

  publication : function() {
    return {
      yearOfPublication: { widget: 'text', label : 'Year of Publication'},
      monthOfPublication: { widget: 'text', label: 'Month of Publication'},
      author: {widget: 'text', label: 'Author'},
      publisher: {widget: 'text', label: 'Publisher'}
    };
  },

  timeline : function() {
    return {
      date: { widget: 'text', className:'date', label: 'Date', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true },
      startDate : {
        widget: 'text',
        label: 'Date Range (Start Date)',
        helpText: 'If you want this entry to appear as a date range, use this field. Format: YYYY-MM-DD or YYYY.',
        isDate: true
      },
      endDate : {
        widget: 'text',
        label: 'Date Range (End Date)',
        isDate: true,
        helpText: 'If you want this entry to appear as a date range, use this field. Format: YYYY-MM-DD or YYYY.'
      }
    };
  },

  heroes : function() {
    return {
      heroQuote: { widget: 'textarea', label: 'Hero Quote', className: 'quote'},
      heroQuoteSource: { widget: 'text', label: 'Hero Quote Citation', className: 'quote-citation'},
      villainQuote: { widget: 'textarea', label: 'Villain Quote', className: 'quote'},
      villainQuoteSource: { widget: 'text', label: 'Villain Quote Citation', className: 'quote-citation'},
      ambiQuote: {widget: 'textarea', label: 'Ambiguous Quote', className: 'quote'},
      ambiQuoteSource: { widget: 'text', label: 'Ambiguous Quote Source', className: 'quote-citation' }
    };
  },

  institutions : function(){
    return {
      latitude : { widget: 'text', label: 'Latitude' },
      longitude : { widget: 'text', label: 'Longitude' },
      residentialSchool : { widget: 'toggle', label: 'Residential School' }
    };
  },

  mindmap : function(){
    return {
      connections: { widget: 'button', name: 'connection', label: 'Connection', className: 'mindmap-connection', helpText: 'Click the button to create a connection.' }
    };
  }

};
