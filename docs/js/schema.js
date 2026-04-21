(function () {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://c-reussite.fr/#website",
        "url": "https://c-reussite.fr/",
        "name": "C'Réussite",
        "description": "Fiches de révision PDF pour la Terminale Spécialité — Maths et Physique-Chimie",
        "keywords": "fiches de révision maths, fiches de révision physique chimie, fiches revision terminale, fiches bac maths, fiches bac physique chimie, révision terminale spécialité 2026",
        "publisher": { "@id": "https://c-reussite.fr/#organization" },
        "inLanguage": "fr-FR"
      },
      {
        "@type": "Organization",
        "@id": "https://c-reussite.fr/#organization",
        "name": "C'Réussite",
        "alternateName": ["C Réussite", "CReussite", "C-Réussite", "c reussite", "creussite", "c'reussite", "C'Reussite"],
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
        "@type": "Person",
        "@id": "https://c-reussite.fr/#camille",
        "name": "Camille Reinhardt",
        "jobTitle": "Polytechnicienne, Docteure en sciences",
        "alumniOf": {
          "@type": "CollegeOrUniversity",
          "name": "École Polytechnique"
        },
        "description": "Créatrice des fiches de révision C'Réussite. Accompagne des élèves en sciences du collège au Master.",
        "url": "https://c-reussite.fr"
      },
      {
        "@type": "Product",
        "@id": "https://c-reussite.fr/maths#product",
        "name": "Fiches Maths Terminale Spécialité",
        "description": "20 fiches de révision Maths Terminale Spécialité — une fiche par chapitre, cours, formules et méthodes. Programme officiel 2026. PDF, téléchargement immédiat.",
        "image": "https://c-reussite.fr/img/cover-maths.jpg",
        "url": "https://c-reussite.fr/maths",
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
          "reviewCount": "3",
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "Product",
        "@id": "https://c-reussite.fr/physique-chimie#product",
        "name": "Fiches Physique-Chimie Terminale Spécialité",
        "description": "32 fiches de révision Physique-Chimie Terminale Spécialité — une fiche par chapitre, cours, formules et méthodes. Programme officiel 2026. PDF, téléchargement immédiat.",
        "image": "https://c-reussite.fr/img/cover-physique.jpg",
        "url": "https://c-reussite.fr/physique-chimie",
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
          "reviewCount": "3",
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "Product",
        "@id": "https://c-reussite.fr/pack#product",
        "name": "Pack Maths + Physique-Chimie Terminale Spécialité",
        "description": "52 fiches de révision Maths et Physique-Chimie Terminale Spécialité — programme officiel 2026. PDF, téléchargement immédiat.",
        "image": "https://c-reussite.fr/img/cover-maths.jpg",
        "url": "https://c-reussite.fr/pack",
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
          "reviewCount": "3",
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment je reçois les fiches ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Par email, en PDF, immédiatement après ta commande. Tu reçois les fichiers en pièce jointe, ainsi que ta facture."
            }
          },
          {
            "@type": "Question",
            "name": "Je peux les imprimer ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui. Format A4, lisibles sur écran comme sur papier. Beaucoup d'élèves les impriment et les annotent directement."
            }
          },
          {
            "@type": "Question",
            "name": "Tout le programme est couvert ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui, l'intégralité du programme Terminale Spécialité Bac 2026, en maths comme en physique-chimie."
            }
          },
          {
            "@type": "Question",
            "name": "Ça remplace le cours ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Non. Les fiches sont faites pour réviser, pas pour découvrir un chapitre. L'ordre logique : travailler le cours d'abord, utiliser les fiches pour consolider et structurer ensuite."
            }
          },
          {
            "@type": "Question",
            "name": "Je suis en difficulté, c'est adapté ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Si tu es prêt à travailler, oui. Elles structurent le programme de façon claire et logique. En revanche, pour des difficultés profondes ou un départ de zéro à J-7 du bac, des cours particuliers seront plus efficaces."
            }
          },
          {
            "@type": "Question",
            "name": "Je n'ai pas de difficultés, quel intérêt ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Gagner du temps. Tout est condensé, structuré, prêt à réviser. Pas besoin de trier des dizaines de pages de cours pour retrouver l'essentiel."
            }
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
