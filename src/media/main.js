var path = anime.path('#motionPath path');

anime({
  targets: '.square',
  translateX: path('x'),
  translateY: path('y'),
  rotate: path('angle'),
  duration: 3000,
  loop: true,
  easing: 'linear'
});