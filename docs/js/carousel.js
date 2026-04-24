(function () {

  // ── Lightbox unique partagé ─────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-inner">
      <button class="lightbox-close" aria-label="Fermer">&times;</button>
      <div class="lightbox-track" id="lightbox-track"></div>
      <button class="lightbox-btn lightbox-prev" aria-label="Image précédente">&#8249;</button>
      <button class="lightbox-btn lightbox-next" aria-label="Image suivante">&#8250;</button>
      <div class="lightbox-dots" id="lightbox-dots"></div>
      <p class="lightbox-counter" id="lightbox-counter"></p>
    </div>`;
  document.body.appendChild(overlay);

  const lbTrack   = overlay.querySelector('#lightbox-track');
  const lbDots    = overlay.querySelector('#lightbox-dots');
  const lbCounter = overlay.querySelector('#lightbox-counter');
  let lbSlides = [], lbDotEls = [], lbCurrent = 0;

  function lbGoTo(index) {
    lbSlides[lbCurrent].classList.remove('active');
    lbDotEls[lbCurrent].classList.remove('active');
    lbCurrent = (index + lbSlides.length) % lbSlides.length;
    lbSlides[lbCurrent].classList.add('active');
    lbDotEls[lbCurrent].classList.add('active');
    lbCounter.textContent = (lbCurrent + 1) + ' / ' + lbSlides.length;
  }

  function openLightbox(slides, startIndex) {
    // Vider et reconstruire
    lbTrack.innerHTML = '';
    lbDots.innerHTML  = '';
    lbSlides  = [];
    lbDotEls  = [];
    lbCurrent = 0;

    slides.forEach(function (src, i) {
      const picture = document.createElement('picture');
      picture.className = 'lightbox-slide' + (i === 0 ? ' active' : '');
      const source = document.createElement('source');
      source.srcset = src.webp;
      source.type   = 'image/webp';
      const img = document.createElement('img');
      img.src = src.png;
      img.alt = src.alt;
      img.loading = 'eager';
      picture.appendChild(source);
      picture.appendChild(img);
      lbTrack.appendChild(picture);
      lbSlides.push(picture);

      const dot = document.createElement('button');
      dot.className = 'lightbox-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Image ' + (i + 1));
      dot.addEventListener('click', function () { lbGoTo(i); });
      lbDots.appendChild(dot);
      lbDotEls.push(dot);
    });

    lbCounter.textContent = '1 / ' + slides.length;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (startIndex > 0) lbGoTo(startIndex);
  }

  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  overlay.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  overlay.querySelector('.lightbox-prev').addEventListener('click', function () { lbGoTo(lbCurrent - 1); });
  overlay.querySelector('.lightbox-next').addEventListener('click', function () { lbGoTo(lbCurrent + 1); });

  // Fermer en cliquant l'overlay
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeLightbox();
  });

  // Clavier : ESC + flèches
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lbGoTo(lbCurrent - 1);
    if (e.key === 'ArrowRight') lbGoTo(lbCurrent + 1);
  });


  // ── Carousels produit ───────────────────────────────
  document.querySelectorAll('.product-carousel').forEach(function (carousel) {
    const slides  = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const dotsEl  = carousel.querySelector('.carousel-dots');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    let current   = 0;

    // Prépare les données pour le lightbox
    const lbData = slides.map(function (slide) {
      return {
        webp: slide.querySelector('source').srcset,
        png:  slide.querySelector('img').src,
        alt:  slide.querySelector('img').alt,
      };
    });

    // Dots produit
    const dots = slides.map(function (_, i) {
      const d = document.createElement('button');
      d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Image ' + (i + 1));
      d.addEventListener('click', function () { goTo(i); });
      dotsEl.appendChild(d);
      return d;
    });

    function goTo(index) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); });

    // Clic → ouvre lightbox
    slides.forEach(function (slide) {
      slide.querySelector('img').addEventListener('click', function () {
        openLightbox(lbData, current);
      });
    });
  });

})();
