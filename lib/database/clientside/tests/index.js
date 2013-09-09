var expect = require('expect.js');

var EugenicsDocument = require('eugenicsdatabase/lib/Model').Document;
var Collection = require('eugenicsdatabase/lib/Collection');

describe('Collection', function(){
	var collection = new Collection();
	describe('#setURL', function(){
		it('should set the appropriate url based on docType and name', function(){
			collection.setUrl('documents', 'concepts');
			expect(collection.url).to.be('/api/documents/concepts');
		});

	describe('#fetch', function(){
		beforeEach(function(){
			this.collection = new Collection();
			this.server = sinon.fakeServer.create();
		});
		afterEach(function(){
			this.server.restore();
		});

		it('should fetch and populate models from the server', function(done){
			var callback = sinon.spy();
			this.server.respondWith('GET', '/api/documents/concepts', [
				200, {'Content-Type': 'application/json' },
				'[{"_id": 1, "title": "bacon"}]'
			]);
			this.collection.setUrl('documents', 'concepts');
			this.collection.fetch(callback);
			this.server.respond();
			expect(collection.length()).to.be(1);
			done();
		});
	})


	})
})