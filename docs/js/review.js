(function () {
  var overlay = document.getElementById('review-overlay');
  var btn = document.getElementById('review-btn');
  var closeBtn = overlay.querySelector('.extract-close');
  var stars = document.querySelectorAll('#review-stars span');
  var ratingInput = document.getElementById('review-rating');
  var rating = 5;

  function setStars(n) {
    rating = n;
    ratingInput.value = 'Avis ' + n + '★';
    stars.forEach(function (s) {
      s.classList.toggle('active', parseInt(s.dataset.star) <= n);
    });
  }

  stars.forEach(function (s) {
    s.addEventListener('click', function () {
      setStars(parseInt(s.dataset.star));
    });
    s.addEventListener('mouseenter', function () {
      var v = parseInt(s.dataset.star);
      stars.forEach(function (st) {
        st.classList.toggle('hover', parseInt(st.dataset.star) <= v);
      });
    });
    s.addEventListener('mouseleave', function () {
      stars.forEach(function (st) { st.classList.remove('hover'); });
    });
  });

  setStars(5);

  btn.addEventListener('click', function () {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  });

  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
})();
