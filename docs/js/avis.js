(function () {
  var BACKEND = 'https://creussite-backend.onrender.com';

  fetch(BACKEND + '/api/avis')
    .then(function (r) { return r.json(); })
    .then(function (avis) {
      if (!avis || !avis.length) return;

      // Mise à jour du résumé
      var total = avis.length;
      var avg = avis.reduce(function (s, a) { return s + (a.note || 5); }, 0) / total;
      var score = Math.round(avg * 10) / 10;
      var scoreEl = document.querySelector('.reviews-score');
      var countEl = document.querySelector('.reviews-count');
      if (scoreEl) scoreEl.textContent = score.toFixed(1).replace('.', ',') + ' / 5';
      if (countEl) countEl.textContent = '(' + total + (total > 1 ? ' avis' : ' avis') + ')';

      // Rendu des cartes
      var track = document.querySelector('.testimonials-track');
      if (!track) return;
      track.innerHTML = avis.map(function (a) {
        var stars = '★'.repeat(a.note || 5);
        var detail = a.niveau + (a.matiere ? ' \u2014 ' + a.matiere : '');
        return '<article class="testimonial-card">'
          + '<div class="testimonial-stars">' + stars + '</div>'
          + '<p class="testimonial-text">\u201c' + a.commentaire + '\u201d</p>'
          + '<div class="testimonial-author">' + a.auteur + '</div>'
          + '<div class="testimonial-detail">' + detail + '</div>'
          + '</article>';
      }).join('');

      // Affichage de la section
      var section = document.getElementById('avis');
      if (section) section.hidden = false;
    })
    .catch(function () { /* section reste cachée si erreur */ });
})();
