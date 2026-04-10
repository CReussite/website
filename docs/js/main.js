/* CRéussite – JavaScript léger */

/* ---- Navigation mobile ---- */
const navToggle = document.getElementById('navToggle');
const mainNav   = document.getElementById('mainNav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const open = navToggle.classList.toggle('is-open');
    mainNav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Ferme le menu quand on clique un lien
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('is-open');
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---- Header ombre au scroll ---- */
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10
    ? '0 4px 24px rgba(14,27,61,0.28)'
    : '0 2px 12px rgba(14,27,61,0.18)';
}, { passive: true });

/* ---- FAQ Accordion ---- */
document.querySelectorAll('.faq__question').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer  = btn.nextElementSibling;
    const isOpen  = btn.getAttribute('aria-expanded') === 'true';
    const allBtns = document.querySelectorAll('.faq__question');

    // Ferme tous les autres
    allBtns.forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.classList.remove('is-open');
    });

    // Ouvre ou ferme le courant
    if (!isOpen) {
      btn.setAttribute('aria-expanded', 'true');
      answer.classList.add('is-open');
    }
  });
});

/* ---- Formulaires lead magnet ---- */
document.querySelectorAll('.lead-form').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email   = form.querySelector('input[type="email"]').value;
    const matiere = form.dataset.matiere || 'Fiche gratuite';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=contact@c-reussite.fr&su=${encodeURIComponent('Demande fiche gratuite \u2013 ' + matiere)}&body=${encodeURIComponent('Bonjour,\n\nJe souhaite recevoir la fiche gratuite : ' + matiere + '\n\nMon email : ' + email + '\n\nMerci !')}`;
    window.open(gmailUrl, '_blank');
  });
});

/* ---- Formulaire contact ---- */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const nom     = document.getElementById('nom').value;
    const email   = document.getElementById('cemail').value;
    const sujet   = document.getElementById('sujet').value;
    const message = document.getElementById('message').value;

    const body = `Nom : ${nom}\nEmail : ${email}\n\n${message}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=contact@c-reussite.fr&su=${encodeURIComponent(sujet)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, '_blank');
    formSuccess.hidden = false;
    contactForm.reset();

    setTimeout(() => { formSuccess.hidden = true; }, 6000);
  });
}
