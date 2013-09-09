var d3 = require('d3');
var $ = require('jquery');

module.exports = function(){

	var tooltip = d3.select('#app')
		.append('div')
		.attr('class', 'pop-up')
		.style('opacity', 0);

	var isMousingOver = false;

	var offset = $('svg').offset();

	d3.select('svg').
	selectAll('.archive-label').
	on('mouseover', function(d){
		// set position
		var el = d3.select(this);
		var scrollTop = $(window).scrollTop();
		var windowWidth = $(window).width();

		isMousingOver = true;
		d3.select(window).on('mousemove', function(){
			var x = d3.event.pageX;
			x = ((x + 350) > windowWidth)
				? x - 345
				: x + 75;

			tooltip
				.style('left', x + 'px')
				.style('top', d3.event.pageY - scrollTop - 70 + 'px');
		});


		el.select('path')
			.transition()
			.duration(300)
			.attr('fill', '#bbb');

		el.select('text')
			.transition()
			.duration(300)
			.attr('fill', 'white');

		tooltip
			.html('<p>Lorem ipsum Non qui aute incididunt esse est cillum consectetur sed dolor labore dolor enim aute cupidatat esse ut exercitation incididunt magna ullamco fugiat.</p>')
			.transition()
			.duration(300)
			.style('opacity', 1);
	}).
	on('mouseout', function(d){

		var el = d3.select(this);

		el.select('path')
			.transition()
			.attr('fill', '#eee');

		el.select('text')
			.transition()
			.attr('fill', '#3d3d3d');

		isMousingOver = false;
		d3.select(window).on('mousemove', null);

		tooltip
			.transition()
			.duration(300)
			.style('opacity', 0);

	});


}
