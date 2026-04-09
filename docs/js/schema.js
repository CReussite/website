(function () {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://creussite.github.io/website/#organization",
        "name": "C'Réussite",
        "url": "https://creussite.github.io/website/",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "contact@creussite.fr",
          "contactType": "customer service",
          "availableLanguage": "French"
        }
      },
      {
        "@type": "Person",
        "@id": "https://creussite.github.io/website/#camille-reinhardt",
        "name": "Camille Reinhardt",
        "jobTitle": "Enseignante, Polytechnicienne, Docteure en sciences de la vie",
        "alumniOf": [
          { "@type": "CollegeOrUniversity", "name": "École Polytechnique" },
          { "@type": "CollegeOrUniversity", "name": "Doctorat en sciences de la vie" }
        ],
        "knowsAbout": ["Mathématiques", "Physique-Chimie", "Pédagogie", "Terminale spécialité"]
      },
      {
        "@type": "Product",
        "name": "Fiches Maths Terminale Spécialité – Bac 2026",
        "description": "20 fiches synthétiques couvrant tout le programme de Mathématiques Terminale Spécialité. Une page par chapitre. Format PDF.",
        "author": { "@id": "https://creussite.github.io/website/#camille-reinhardt" },
        "brand":  { "@id": "https://creussite.github.io/website/#organization" },
        "offers": {
          "@type": "Offer",
          "price": "14.99",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        }
      },
      {
        "@type": "Product",
        "name": "Fiches Physique-Chimie Terminale Spécialité – Bac 2026",
        "description": "32 fiches synthétiques couvrant tout le programme de Physique-Chimie Terminale Spécialité. Une page par chapitre. Format PDF.",
        "author": { "@id": "https://creussite.github.io/website/#camille-reinhardt" },
        "brand":  { "@id": "https://creussite.github.io/website/#organization" },
        "offers": {
          "@type": "Offer",
          "price": "14.99",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Ces fiches remplacent-elles le cours ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Non. Elles sont conçues pour la révision, pas pour l'apprentissage initial."
            }
          },
          {
            "@type": "Question",
            "name": "Ces fiches sont-elles adaptées aux élèves en difficulté ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Elles fonctionnent pour tout élève prêt à travailler. Elles structurent le programme de façon claire et logique."
            }
          },
          {
            "@type": "Question",
            "name": "Comment reçoit-on les fiches ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Par email instantanément après la commande, au format PDF téléchargeable."
            }
          }
        ]
      }
    ]
  };

  const tag = document.createElement('script');
  tag.type = 'application/ld+json';
  tag.textContent = JSON.stringify(schema);
  document.head.appendChild(tag);
})();
