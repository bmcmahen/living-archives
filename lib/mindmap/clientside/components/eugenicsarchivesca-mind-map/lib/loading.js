var constants = require('./constants');

module.exports = function(ctx, speed, size, small){
  this.speed = speed || 60;
  this.size = size || 60;
  this.percent = this.percent || 0;
  this.percent = (this.percent + this.speed / 36) % 100;
  ctx.save();
  var tx = small ? -15 : -15 + (constants.CONTAINER_WIDTH / 2);
  var ty = small ? -15 : -15 + (constants.CONTAINER_HEIGHT / 2);
  ctx.translate(tx, ty);
  var percent = this.percent;
  var ratio = window.devicePixelRatio || 1;
  var size = this.size / ratio;
  var half = size / 2;
  var x = half;
  var y = half;
  var rad = half - 1;
  var angle = Math.PI * 2 * (percent / 100);
  var grad = ctx.createLinearGradient(
    half + Math.sin(Math.PI * 1.5 - angle) * half,
    half + Math.cos(Math.PI * 1.5 - angle) * half,
    half + Math.sin(Math.PI * 0.5 - angle) * half,
    half + Math.cos(Math.PI * 0.5 - angle) * half
  );

  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 1)');

  ctx.lineWidth = 7;

  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, rad, angle - Math.PI, angle, false);
  ctx.stroke();

  // inner circle
  ctx.strokeStyle = 'rgba(0, 0, 0, .4)';
  ctx.beginPath();
  ctx.arc(x, y, rad - 1, 0, Math.PI * 2, true);
  ctx.stroke();
  ctx.restore();
}