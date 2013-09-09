var empty = require('empty')
	, append = require('append');

module.exports = function(el, content){
	return append(empty(el), content);
};