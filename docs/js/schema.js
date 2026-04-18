(function () {
  var schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://c-reussite.fr/#website",
        "url": "https://c-reussite.fr/",
        "name": "C'Réussite",
        "description": "Fiches de révision PDF pour la Terminale Spécialité — Maths et Physique-Chimie",
        "publisher": { "@id": "https://c-reussite.fr/#organization" },
        "inLanguage": "fr-FR"
      },
      {
        "@type": "Organization",
        "@id": "https://c-reussite.fr/#organization",
        "name": "C'Réussite",
        "url": "https://c-reussite.fr/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://c-reussite.fr/img/logo.jpeg"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "contact@c-reussite.fr",
          "contactType": "customer service"
        }
      },
      {
        "@type": "ItemList",
        "name": "Fiches de révision Terminale Spécialité",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "item": {
              "@type": "Product",
              "name": "Fiches Maths Terminale Spécialité",
              "description": "20 fiches de révision Maths Terminale Spécialité — une fiche par chapitre, cours, formules et méthodes. Programme officiel 2026. PDF, téléchargement immédiat.",
              "image": "https://c-reussite.fr/img/couverture-maths.jpg",
              "url": "https://c-reussite.fr/#fiches",
              "brand": { "@type": "Brand", "name": "C'Réussite" },
              "offers": {
                "@type": "Offer",
                "price": "14.99",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "seller": { "@id": "https://c-reussite.fr/#organization" }
              }
            }
          },
          {
            "@type": "ListItem",
            "position": 2,
            "item": {
              "@type": "Product",
              "name": "Fiches Physique-Chimie Terminale Spécialité",
              "description": "32 fiches de révision Physique-Chimie Terminale Spécialité — une fiche par chapitre, cours, formules et méthodes. Programme officiel 2026. PDF, téléchargement immédiat.",
              "image": "https://c-reussite.fr/img/couverture-physique.jpg",
              "url": "https://c-reussite.fr/#fiches",
              "brand": { "@type": "Brand", "name": "C'Réussite" },
              "offers": {
                "@type": "Offer",
                "price": "14.99",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "seller": { "@id": "https://c-reussite.fr/#organization" }
              }
            }
          },
          {
            "@type": "ListItem",
            "position": 3,
            "item": {
              "@type": "Product",
              "name": "Pack Maths + Physique-Chimie Terminale Spécialité",
              "description": "52 fiches de révision Maths et Physique-Chimie Terminale Spécialité — programme officiel 2026. PDF, téléchargement immédiat.",
              "image": "https://c-reussite.fr/img/couverture-maths.jpg",
              "url": "https://c-reussite.fr/#fiches",
              "brand": { "@type": "Brand", "name": "C'Réussite" },
              "offers": {
                "@type": "Offer",
                "price": "24.99",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "seller": { "@id": "https://c-reussite.fr/#organization" }
              }
            }
          }
        ]
      }
    ]
  };

  var script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
})();
