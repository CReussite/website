document.getElementById('contact-placeholder').outerHTML = `
  <section id="contact" aria-labelledby="contact-title">
    <div class="container">
      <div class="text-center">
        <h2 id="contact-title">Une question ?</h2>
        <p>Commande, contenu des fiches, cours particuliers — écris-moi directement.</p>
      </div>

      <form class="contact-form" action="mailto:contact@creussite.fr" method="get" enctype="text/plain" aria-label="Formulaire de contact">
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
          <textarea class="form-control" id="contact-message" name="body" placeholder="Écris ta question ici..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Envoyer</button>
      </form>

      <p class="text-center mt-16 contact-alt">
        Ou directement par email : <a href="mailto:contact@creussite.fr">contact@creussite.fr</a>
      </p>
    </div>
  </section>
`;
