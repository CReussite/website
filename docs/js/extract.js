(function () {
  var labels = {
    maths: {
      title: 'Recevoir un extrait Maths',
      desc: 'Reçois une fiche Maths Terminale Spécialité gratuitement par email.',
      subject: 'Extrait Maths'
    },
    physique: {
      title: 'Recevoir un extrait Physique-Chimie',
      desc: 'Reçois une fiche Physique-Chimie Terminale Spécialité gratuitement par email.',
      subject: 'Extrait Physique-Chimie'
    },
    bundle: {
      title: 'Recevoir un extrait Pack complet',
      desc: 'Reçois une fiche Maths et une fiche Physique-Chimie gratuitement par email.',
      subject: 'Extrait Pack Maths + PC'
    }
  };

  var overlay = document.getElementById('extract-overlay');
  var title   = document.getElementById('extract-popup-title');
  var desc    = document.getElementById('extract-popup-desc');
  var product = document.getElementById('extract-product');
  var closeBtn = overlay.querySelector('.extract-close');

  var popup = overlay.querySelector('.extract-popup');

  document.querySelectorAll('[data-extract]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-extract');
      var info = labels[key];
      title.textContent = info.title;
      desc.textContent = info.desc;
      product.value = info.subject;
      popup.classList.toggle('extract-popup--pack', key === 'bundle');
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
    });
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
