(function () {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "https://c-reussite.fr/maths-terminale/#product",
        "name": "Fiches Maths Terminale Spécialité",
        "description": "20 fiches de révision Maths Terminale Spécialité — une fiche par chapitre, cours, formules et méthodes. Programme officiel 2026. PDF, téléchargement immédiat.",
        "image": "https://c-reussite.fr/img/cover-maths.jpg",
        "url": "https://c-reussite.fr/maths-terminale/",
        "brand": { "@type": "Brand", "name": "C'Réussite" },
        "author": { "@id": "https://c-reussite.fr/#camille" },
        "offers": {
          "@type": "Offer",
          "price": "14.99",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock",
          "seller": { "@id": "https://c-reussite.fr/#organization" }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "reviewCount": "1",
          "bestRating": "5",
          "worstRating": "1"
        },
        "review": [
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Neyla" },
            "reviewBody": "Les fiches sont géniales, le cours est très bien expliqué et il y a des méthodes qui s'appliquent à tous les exercices. Il y a aussi des explications sur quand et comment il faut utiliser certaines formules lorsqu'il y en a plusieurs dans un seul chapitre et je trouve ça vraiment utile.",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }
          }
        ]
      },
      {
        "@type": "Product",
        "@id": "https://c-reussite.fr/physique-chimie-terminale/#product",
        "name": "Fiches Physique-Chimie Terminale Spécialité",
        "description": "32 fiches de révision Physique-Chimie Terminale Spécialité — une fiche par chapitre, cours, formules et méthodes. Programme officiel 2026. PDF, téléchargement immédiat.",
        "image": "https://c-reussite.fr/img/cover-physique.jpg",
        "url": "https://c-reussite.fr/physique-chimie-terminale/",
        "brand": { "@type": "Brand", "name": "C'Réussite" },
        "author": { "@id": "https://c-reussite.fr/#camille" },
        "offers": {
          "@type": "Offer",
          "price": "14.99",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock",
          "seller": { "@id": "https://c-reussite.fr/#organization" }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "reviewCount": "1",
          "bestRating": "5",
          "worstRating": "1"
        },
        "review": [
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Neyla" },
            "reviewBody": "Les fiches sont très complètes. On retrouve le cours entier en une seule page avec des méthodes qui s'appliquent pour tous les exercices. Je les recommande.",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }
          }
        ]
      },
      {
        "@type": "Product",
        "@id": "https://c-reussite.fr/pack-maths-physique-chimie/#product",
        "name": "Pack Maths + Physique-Chimie Terminale Spécialité",
        "description": "52 fiches de révision Maths et Physique-Chimie Terminale Spécialité — programme officiel 2026. PDF, téléchargement immédiat.",
        "image": "https://c-reussite.fr/img/cover-maths.jpg",
        "url": "https://c-reussite.fr/pack-maths-physique-chimie/",
        "brand": { "@type": "Brand", "name": "C'Réussite" },
        "author": { "@id": "https://c-reussite.fr/#camille" },
        "offers": {
          "@type": "Offer",
          "price": "24.99",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock",
          "seller": { "@id": "https://c-reussite.fr/#organization" }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "reviewCount": "2",
          "bestRating": "5",
          "worstRating": "1"
        },
        "review": [
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Lucie" },
            "reviewBody": "Ces fiches regroupent le cours en une seule page, elles m'aident au quotidien, sont faciles d'accès et très récapitulatives. Tu peux voir ton chapitre en un clin d'œil. Je ne m'en passe plus. Très satisfaite de mon achat.",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Isabelle" },
            "reviewBody": "Achat fait pour ma fille. Cela lui a permis de revoir les différentes notions plus sereinement. Ces fiches lui facilitent la vie. Elle ne s'en passe plus. Ravie de mon achat.",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }
          }
        ]
      }
    ]
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
})();
