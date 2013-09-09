var Spinner = require('spinner');

var el = document.getElementById('loading-wrapper');
var appended = false;

module.exports = {
	show: function(){
		if (appended) return;
		this.spinner = new Spinner()
			.size(30)
			.light();
		el.appendChild(this.spinner.el);
		appended = true;
	},
	hide: function(){
		if (appended) el.removeChild(this.spinner.el);
		this.spinner.stop();
		appended = false;
	}
};