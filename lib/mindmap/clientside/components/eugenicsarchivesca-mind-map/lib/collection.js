// Our generic collection class maintains both an array
// and a key/value listing for quick lookup.
var Collection = module.exports = function(){};

Collection.prototype.remove = function(key){
  delete this.obj[key];

  var models = this.models
    , len = models.length;

  while (len--){
    if (models[len].attr._id === key) {
      models.splice(len, 1);
    }
  }

  return this;
};

Collection.prototype.at = function(i){
  return this.models[i];
};

Collection.prototype.get = function(key){
  return this.obj[key];
};

Collection.prototype.add = function(item, key){
  this.obj[key] = item;
  this.models.push(item);
  return this;
};

Collection.prototype.forEach = function(fn){
  var models = this.models
    , len = models.length;

  for (var i = 0; i < len; i++){
    fn(models[i], i);
  }
  return this;
};