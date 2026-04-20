(function () {
  var BACKEND = 'https://creussite-backend.onrender.com';

  var overlay    = document.getElementById('review-overlay');
  var btn        = document.getElementById('review-btn');
  var closeBtn   = overlay.querySelector('.extract-close');
  var stars      = document.querySelectorAll('#review-stars span');
  var rating     = 5;

  function setStars(n) {
    rating = n;
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

  document.getElementById('review-form').addEventListener('submit', function (e) {
    e.preventDefault();

    var submitBtn = this.querySelector('button[type="submit"]');
    var prenom  = document.getElementById('review-name').value.trim();
    var message = document.getElementById('review-message').value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi…';

    fetch(BACKEND + '/api/avis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: prenom, note: rating, message: message }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          submitBtn.textContent = 'Avis envoyé, merci !';
          setTimeout(function () {
            document.getElementById('review-form').reset();
            setStars(5);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Envoyer mon avis';
            close();
          }, 1500);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Envoyer mon avis';
          alert(data.error || "Erreur lors de l'envoi.");
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer mon avis';
        alert("Erreur réseau. Réessaie dans quelques instants.");
      });
  });
})();
