const BACKEND_URL = 'https://creussite-backend.onrender.com';

document.getElementById('contact-placeholder').outerHTML = `
  <section id="contact" aria-labelledby="contact-title">
    <div class="container">
      <div class="text-center">
        <h2 id="contact-title">Une question ?</h2>
      </div>

      <form class="contact-form" id="contact-form" aria-label="Formulaire de contact" novalidate>
        <div class="form-group">
          <label class="form-label" for="contact-name">Nom</label>
          <input class="form-control" type="text" id="contact-name" name="name" placeholder="Ton nom" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="contact-email">Email</label>
          <input class="form-control" type="email" id="contact-email" name="email" placeholder="ton@email.fr" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="contact-subject">Sujet</label>
          <input class="form-control" type="text" id="contact-subject" name="subject" placeholder="Commande, question sur les fiches...">
        </div>
        <div class="form-group">
          <label class="form-label" for="contact-message">Message</label>
          <textarea class="form-control" id="contact-message" name="body" placeholder="Écris ta question ici..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="contact-submit">Envoyer</button>
        <p id="contact-feedback" style="display:none;margin-top:12px;font-weight:600;"></p>
      </form>

      <p class="text-center mt-16 contact-alt">
        Ou directement par email : <a href="mailto:contact@c-reussite.fr">contact@c-reussite.fr</a>
      </p>
    </div>
  </section>
`;

(function () {
  const form      = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit');
  const feedback  = document.getElementById('contact-feedback');

  function showFeedback(text, isError) {
    feedback.textContent = text;
    feedback.style.color = isError ? '#c0392b' : '#27ae60';
    feedback.style.display = 'block';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email   = document.getElementById('contact-email').value.trim();
    const body    = document.getElementById('contact-message').value.trim();
    const name    = document.getElementById('contact-name').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();

    if (!email) { showFeedback('Merci d\'indiquer ton adresse email.', true); return; }
    if (!body)  { showFeedback('Merci d\'écrire un message.', true); return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Envoi en cours…';
    feedback.style.display = 'none';

    try {
      const res = await fetch(BACKEND_URL + '/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, subject, body }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      form.reset();
      submitBtn.textContent = 'Envoyer';
      submitBtn.disabled    = false;
      showFeedback('Message envoyé ! On te répondra rapidement.', false);
    } catch (err) {
      const msg = (!err.message || err.message === 'Load failed' || err.message === 'Failed to fetch')
        ? 'Connexion impossible. Tu peux aussi nous écrire directement à contact@c-reussite.fr'
        : err.message;
      showFeedback(msg, true);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Envoyer';
    }
  });
})();
