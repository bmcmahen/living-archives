var Documents = require('./schema').Document;
var Links = require('./schema').Links;
var _ = require('underscore');
var moment = require('moment');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId;
var express = require('express');
var app = module.exports = express();

// Maps type urls to type
var paramToType = {
  'events' : 'event',
  'concepts' : 'concept',
  'people' : 'person',
  'places' : 'place',
  'publications' : 'publication'
};

// Maps prod urls to prod
var paramToProd = {
  'heroes-and-villains' : 'heroes',
  'timeline' : 'timeline',
  'institutions' : 'institutions',
  'mindmap' : 'mindmap'
};


// If an id is present in the route, then I'll query for that
// document and cache it in req.doc

app.param('id', function(req, res, next, id){
  Documents
    .findById(id)
    .populate('connections')
    .exec(function(err, doc){
      if (err) return next(err);
      req.doc = doc;
      next();
    });
});

// If a collection is present in the route, then I map
// it to the non-pluralized form, and cache it.

app.param('collection', function(req, res, next, col){
  req.type = paramToType[col];
  next();
});

app.param('prod', function(req, res, next, prodName){
  Documents
    .find({ prods: paramToProd[prodName] })
    .populate('connections')
    .sort({ title: 'asc' })
    .exec(function(err, prods){
      if (err) return next(err);
      req.prods = prods;
      next();
    });
});



////////////////////////////////////////
// Save, Update & Delete Connections //
////////////////////////////////////////

// (1) If a connection doesn't have an _id, assume that it's new.
// Create a new conneciton document with from as the current document
// to as specified. Add this link to from and to document.
//
// (2) If a connection does have an _id, assume it's old. Update the connection
// document, and update the document in the current doc and to doc.
//
// (3) If a connection no longer exists given our new document info, then we should
// remove that document, and update our arrays in both our from and to documents.
//

/**
 * Ensure that our id is an ObjectId and
 * not a String.
 * @param  {String || Object} id
 * @return {Object}
 */

var castId = function(id){
  return (typeof id === 'string')
    ? ObjectId.fromString(id)
    : id;
};

/**
 * Take a newly instantiated link and insert it into the
 * `to` document model. Also save the link.
 *
 * @param  {Links} link
 * @return {callback}
 */

var saveLink = function(link){
  return function(callback){
    Documents.findById(link.to._id, function(err, doc){
      if (err) return callback(err);
      doc.connections.push(link._id);
      doc.save(function(err, doc){
        if (err) return callback(err);
        link.save(callback);
      });
    });
  };
};

/**
 * Update our Links
 * @param  {Links} conn
 * @return {callback}
 */

var updateLink = function(link){
  return function(callback){
    link.to._id = castId(link.to._id);
    link.from._id = castId(link.from._id);
    var id = _.clone(link._id);
    delete link._id;

    Links.findById(id, function(err, doc){
      doc.set(link);
      doc.save(callback);
    });
  };
};


/**
 * Pull our link _id from any participating nodes, and also delete
 * the link from our Collection
 * @param  {Links} link
 * @return {callback}
 */

var deleteLink = function(doc){
  var _id = castId(doc._id);
  return function(callback){
    Documents.find({ connections : _id }, function(err, docs){
      if (err) return callback(err);

      // For all of the documents we find containing a link (it should
      // be two) create a function that removes the ObjectId from
      // the array of connections.
      var fns = _.map(docs, function(d){
        return function(cb){
          d.connections.remove(_id);
          d.save(cb);
        }
      });

      // Remove the actual Link document, too.
      fns.push(function(cb){
        Links.findByIdAndRemove(_id).exec(cb);
      });

      // Execute all of the removal functions in parallel.
      async.parallel(fns, function(err, res){
        callback(err, res);
      });
    });
  };
};

/**
 * Update, Create, or Delete links
 * @param  {Document} doc
 * @return {callback}
 */

var handleConnections = function(doc, connections, fn){
  if (!connections) return fn();
  var previousLinks = _.clone(doc.connections);
  var saveFunctions = [];
  var newLinks = [];

  _.each(connections, function(conn){

    // if a new link, add it
    if (!conn._id){
      conn.from = { _id: doc._id, title: doc.title };
      conn.to._id = castId(conn.to._id);
      var newLink = new Links(conn);
      newLinks.push(newLink);
      doc.connections.push(newLink._id);
      return saveFunctions.push(saveLink(newLink));
    }

    // if an old link, update it
    // xxx - check for differences first?
    if (conn._id){
      newLinks.push(conn);
      return saveFunctions.push(updateLink(conn));
    }

  });

  // determine if we should delete any old links if
  // they are no longer contained in our newer set of
  // connections.
  if (previousLinks && previousLinks.length > 0){

    // array diff to find missing connections
    _.each(previousLinks, function(oldConn){
      var contains = true;
      contains = _.find(newLinks, function(newConn){
        var n_id = castId(newConn._id);
        return n_id.equals(oldConn._id);
      });

      if (!contains) saveFunctions.push(deleteLink(oldConn));
    });
  }

  // Save everything in parallel, and once they finish
  // then send our list of links back.
  async.parallel(saveFunctions, function(err, results){
    fn(err, results);
  });
};


////////////////////////////
// New Database Documents //
////////////////////////////

// xxx rewrite this. it's ugly.
app.post('/api/documents', function(req, res){

  var usr = req.user;
  var content = req.body;

  content.created_by = { name: usr.name, _id: usr._id };
  content.created_at = moment().format();
  content.modified_at = moment().format();

  var attr = _.clone(content);
  delete attr.connections;

  var doc = new Documents(attr);

  if (content.connections){
    var connections = handleConnections(doc, content.connections, function(err, docs){
       if (err) return next(err);

       // Save our document.
       doc.save(function (err){
        if (!err) res.end();
        else res.send(err);
      });
    });
  } else {
    // Save our document.
    doc.save(function (err){
      if (err) return next(err);
      res.end();
    });
   }

});





// Retrieves JSON for document that we are editing
app.get('/api/documents/:doctype/:id', function(req, res){

  if (req.doc) {
    res.send(req.doc);
  }

});


// Submits an Edit of the document
app.put('/api/documents/:id', function(req, res, next){

 if (req.doc) {
  // Crappy hack. I need to $unset the fields that have been deleted.
  // The only good way to do this is to compare the previous fields to the
  // new ones, figure out which are missing, and unset those keys.
  // To unset the keys, apparently you can set that attribute to 'undefined'
  // and it will call a native $unset in mongodb.

  var oldAttributes = req.doc.toJSON()
    , toUnset = {};

  _.each(oldAttributes, function(obj, key){
    if (!req.body[key] && key !== '__v' && key !== '_id'){
      toUnset[key] = 1;
    }
  });

  var triggerSave = function(){
    var usr = req.user;
    if (!usr) return;
    req.body.modified_by = { name: usr.name, _id: usr._id };
    req.body.modified_at = moment().format();
    delete req.body.currentUser;

    var attr = _.clone(req.body);
    delete attr.connections;

    handleConnections(req.doc, req.body.connections, function(err, result){
      req.doc.set(attr);
      req.doc.save(function(err){
        if (err) return next(err);
        return res.send(req.doc);
      });
    });
  };

  if (! _.isEmpty(toUnset)){
    Documents.update({_id: req.doc._id}, {
      $unset: toUnset
    }, function(){
     triggerSave();
    });
  } else {
    triggerSave();
  }


 }
});


///////////////////////
// Delete a Document //
///////////////////////

app.delete('/api/documents/:id', function(req, res, next){
  var deleteFunctions = [];
  if (!req.doc) return next(new Error('Document not found.'));

  // If we have any connections to this document, then
  // delete them too.
  if (req.doc.connections){
    _.each(req.doc.connections, function(link){
      deleteFunctions.push(deleteLink(link));
    });
  }

  // delete the requested document
  deleteFunctions.push(function(fn){
    req.doc.remove(fn);
  });

  // execute our deletes in parallel
  async.parallel(deleteFunctions, function(err){
    if (err) return next(err);
    res.send(204);
  });
});


// Return Prod Documents
app.get('/api/prods/:prod', function(req, res, next){
  res.send(req.prods);
});

// Return
app.get('/api/documents/:collection', function(req, res, next){
  Documents
    .find({ type : req.type })
    .populate('connections')
    .sort({ title : 'asc' })
    .exec(function(err, docs){
      if (err) return next(err);
      res.send(docs);
    });
});

// Get Current User
app.get('/api/user', function(req, res, next){
  res.send(req.user);
});


////////////////////////
// Manage Connections //
////////////////////////

// Given an id, return a list of links
var getLinks = function(id, fn){
  Links
    .find({ $or : [{ 'from._id' : id}, { 'to._id' : id }]})
    .exec(fn);
};

// Given an id, return a list of potential nodes
var getPotentialNodes = function(fn){
  Documents
    .find({ prods : 'mindmap' })
    .exec(fn);
};


// Return an object that contains an array of links &
// an array of potential nodes (not including those already)
// linked to.
app.get('/api/relations/:id', function(req, res, next){

  var documentId = castId(req.params.id)
    , toReturn = { links: [], potentialNodes: [] };

  async.parallel({
    // Get links
    links : function(callback){
      getLinks(documentId, callback);
    },
    // Get nodes
    nodes : function(callback){
      getPotentialNodes(callback);
    }
  },
  // execute functions
  function(err, results){
    if (err) return next(err);
    var links = results.links;
    var nodes = results.nodes;

    toReturn.links = links;

    // Filter our node list
    toReturn.potentialNodes = _.reject(nodes, function(node){
      // Don't include our current node
      if (node._id.equals(documentId)) return true;
      // Don't include those already linked to
      if (links && links.length > 0){
        return _.some(links, function(link){
          if (link.from._id.equals(node._id) || link.to._id.equals(node._id))
            return true;
        });
      }
    });

    toReturn.potentialNodes.sort(function(a, b){
      if(a.title < b.title) return -1;
      if(a.title > b.title) return 1;
      return 0;
    });

    res.send(toReturn);

  });
});

app.get('/api/relations/', function(req, res, next){
  var toReturn = { links: [], potentialNodes: []};
  getPotentialNodes(function(err, nodes){
    if (err) return next(err);
    toReturn.potentialNodes = nodes;
    res.send(toReturn);
  });
});

