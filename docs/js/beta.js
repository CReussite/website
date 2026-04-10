/* ===== Beta feedback form ===== */
(function () {
  var API_BASE = 'https://website-production-2f4e.up.railway.app';
  var form     = document.getElementById('beta-form');
  var submitBtn = document.getElementById('beta-submit');
  var successEl = document.getElementById('beta-success');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Collect checked checkboxes as arrays
    function getChecked(name) {
      var boxes = form.querySelectorAll('input[name="' + name + '"]:checked');
      return Array.prototype.map.call(boxes, function (b) { return b.value; });
    }

    // Collect radio value
    function getRadio(name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : null;
    }

    // Validation
    var email = form.querySelector('#beta-email').value.trim();
    var fiches = getChecked('fiches');
    var noteGlobale = getRadio('note_globale');
    var clarte = getRadio('clarte');
    var presentation = getRadio('presentation');
    var couverture = getRadio('couverture');
    var recommandation = getRadio('recommandation');

    if (!email) { alert('Merci d\'indiquer ton adresse email.'); return; }
    if (fiches.length === 0) { alert('Merci de cocher au moins une fiche testée.'); return; }
    if (!noteGlobale) { alert('Merci de donner une note globale.'); return; }
    if (!clarte) { alert('Merci de répondre à la question sur la clarté.'); return; }
    if (!presentation) { alert('Merci de répondre à la question sur la présentation.'); return; }
    if (!couverture) { alert('Merci de répondre à la question sur la couverture du programme.'); return; }
    if (!recommandation) { alert('Merci de répondre à la question sur la recommandation.'); return; }

    var payload = {
      email: email,
      prenom: (form.querySelector('#beta-prenom').value || '').trim(),
      fiches: fiches,
      note_globale: parseInt(noteGlobale, 10),
      clarte: clarte,
      presentation: presentation,
      couverture: couverture,
      points_forts: getChecked('points_forts'),
      ameliorations: getChecked('ameliorations'),
      utilisation: getRadio('utilisation'),
      recommandation: recommandation,
      prix: getRadio('prix'),
      commentaire: (form.querySelector('#beta-commentaire').value || '').trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    fetch(API_BASE + '/api/beta-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function (res) {
      if (!res.ok) throw new Error('Erreur serveur (' + res.status + ')');
      return res.json();
    })
    .then(function () {
      form.style.display = 'none';
      successEl.hidden = false;
    })
    .catch(function (err) {
      console.error('Beta feedback error:', err);
      alert('Erreur lors de l\'envoi. Vérifie ta connexion et réessaie.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer mon retour';
    });
  });
})();
