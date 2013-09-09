var jade = require('component-jade');
var _ = require('underscore');
var stylus = require('component-stylus-plugin');
var nib = require('nib');
var path = require('path');

// stylus.includeCSS = true;
stylus.plugins.push(nib);
stylus.imports = [
	path.join(__dirname, 'lib/frontend/clientside/styles/variables.styl')
];

var builderConfig = function(base){
	return {
		output: 'public/javascripts',
		base: base,
		scripts: true,
		styles: true,
		configure: function(builder){
			builder.use(jade);
			builder.use(stylus);
		}
	};
};

module.exports = function(grunt){
	grunt.initConfig({
		component_build: {
			application: builderConfig('lib/frontend/clientside'),
			heroes: builderConfig('lib/heroes-and-villains/clientside'),
			mindmap: builderConfig('lib/mindmap/clientside'),
			exploring: builderConfig('lib/exploring-archives/clientside'),
			institutions: builderConfig('lib/institutions/clientside'),
			timeline: builderConfig('lib/timeline/clientside'),
			database: builderConfig('lib/database/clientside')
		},
		watch: {
			client : {
				files: ['lib/**/*.js', 'lib/**/*.css', 'lib/**/*.styl'],
				tasks: ['default']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-component-build');

	grunt.registerTask('default', [
		'component_build'
	]);

}