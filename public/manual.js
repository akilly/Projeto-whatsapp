/* Destaca no sumário a seção que está na tela. */
(function () {
  var links = [].slice.call(document.querySelectorAll('nav.side a'));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
  var heads = [].slice.call(document.querySelectorAll('main h2[id]'));
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove('on'); });
      var a = map[e.target.id]; if (a) { a.classList.add('on'); if (a.scrollIntoView && window.innerWidth <= 860) a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    });
  }, { rootMargin: '-90px 0px -70% 0px' });
  heads.forEach(function (h) { io.observe(h); });
})();
