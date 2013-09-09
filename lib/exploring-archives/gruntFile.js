// Build script for this module.
// In the terminal (with grunt installed) navigate to the directory and type:
//
// grunt watch
// or
// grunt

module.exports = function(grunt){

	grunt.initConfig({

		stylus: {
			compile: {
				"include css" : true
			},
			files: {
				'/public/styles/exploring.css' : 'styles/exploring.styl'
			}
		},

		uglify: {
			files: {
				'/public/javascripts/exploring.min.js' : [
					'scripts/d3.v3.js',
					'scripts/blueprint.js'
				]
			}
		},

		watch: {
			files: ['styles/*', 'scripts/*'],
			tasks: ['default']
		}

	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-stylus');

	grunt.registerTask('default', [
		'stylus', 'uglify'
	]);

}