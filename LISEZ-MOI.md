# C'Réussite — Guide propriétaire

> Document rédigé pour Camille Reinhardt — aucune connaissance technique requise.
> Dernière mise à jour : 10 avril 2026

---

## Le site en résumé

C'Réussite est une boutique automatisée : le client paie, reçoit ses fiches PDF par email dans les secondes qui suivent. Aucune intervention manuelle, 24h/24.

---

## Les pages du site

| Page | Adresse | Visible publiquement ? |
|---|---|---|
| Page d'accueil | c-reussite.fr | Oui |
| Après paiement réussi | c-reussite.fr/success.html | Oui (redirigé par Stripe) |
| Après annulation | c-reussite.fr/cancel.html | Oui (redirigé par Stripe) |
| Conditions Générales de Vente | c-reussite.fr/cgv.html | Oui |
| Conditions Générales d'Utilisation | c-reussite.fr/cgu.html | Oui |
| Mentions légales | c-reussite.fr/mentions-legales.html | Oui — ⚠️ SIRET et adresse à compléter |
| Politique de confidentialité | c-reussite.fr/confidentialite.html | Oui |
| Formulaire beta-testeurs | c-reussite.fr/beta.html | Non référencé — lien à partager manuellement |
| Tableau de bord admin | c-reussite.fr/admin.html | Protégé par mot de passe (`ADMIN_KEY`) |

---

## Le catalogue

| Produit | Prix | Ce qui est livré |
|---|---|---|
| Fiches Maths Terminale Spécialité | 14,99 € | `fiches-maths.pdf` |
| Fiches Physique-Chimie Terminale Spécialité | 14,99 € | `fiches-physique-chimie.pdf` |
| Pack Maths + Physique-Chimie | 24,99 € | Les deux PDFs |

Des extraits gratuits existent pour chaque produit — envoyés automatiquement quand un visiteur clique sur "Recevoir un extrait".

### Modifier le catalogue

Toute modification du catalogue (prix, nom, ajout de produit) nécessite l'intervention d'un développeur. Ne jamais modifier un identifiant produit existant : les commandes passées y font référence.

---

## Comment fonctionne une commande

1. Le client clique sur "Commander" et coche deux cases obligatoires (renonciation au droit de rétractation + CGV)
2. Il est redirigé vers la page de paiement sécurisée Stripe — les données bancaires ne transitent jamais par le site
3. Après paiement, Stripe notifie automatiquement le serveur
4. Le serveur enregistre la commande, génère la facture, et envoie l'email avec les PDFs
5. Le client reçoit ses fichiers dans les secondes qui suivent

Si le paiement échoue ou est annulé, aucune commande n'est créée et aucun email n'est envoyé.

---

## Ce que reçoit le client

Immédiatement après paiement, un email automatique contenant :
- Le ou les PDF(s) du produit acheté (avec traçage invisible, voir ci-dessous)
- La facture PDF numérotée (format `2026-001`)
- Le récapitulatif : produit, prix TTC, date, mentions légales

Une copie de chaque email est envoyée en BCC à l'adresse configurée dans `BCC_EMAIL` (variable Render).

---

## Protection contre le partage illégal

Chaque PDF livré est marqué invisiblement avant envoi. Le fichier est visuellement identique à l'original, mais le nom et l'email de l'acheteur y sont inscrits en texte blanc taille 4pt, 5 fois par page — indétectable à l'œil nu, résistant aux outils de nettoyage de métadonnées.

**Pour identifier l'origine d'un fichier partagé illégalement** : ouvrir le PDF dans Adobe Acrobat, faire `Ctrl+A`, copier dans un éditeur de texte — nom et email lisibles 5 fois par page.

**Si l'acheteur a utilisé un faux nom ou un faux email :** les coordonnées bancaires dans Stripe sont suffisantes pour une mise en demeure. Stripe conserve les 4 derniers chiffres de la carte, le nom du titulaire et l'empreinte unique (`fingerprint`) — non falsifiables.

---

## La facturation

- Numérotation séquentielle par année : `2026-001`, `2026-002`…
- Chaque facture contient : nom du vendeur (C'Réussite), email acheteur, produit, prix TTC, mention TVA (article 293 B du CGI), mention "Facture acquittée"
- Les factures sont archivées et re-téléchargeables à tout moment depuis le tableau de bord admin (bouton "PDF" par ligne)

---

## Tableau de bord admin

Accès : **c-reussite.fr/admin.html** — saisir la clé `ADMIN_KEY` configurée dans Render.

Un bandeau jaune s'affiche si Stripe est en mode test (= aucun vrai paiement possible).

**Ce qu'on y voit :**
- Nombre de commandes, chiffre d'affaires total, emails envoyés, commandes en attente
- Tableau complet des commandes (N° facture, date, email, produit, montant, statut email)
- Filtre par année

**Ce qu'on peut faire :**
- Télécharger une facture PDF (bouton "PDF" par ligne)
- Exporter toutes les commandes en CSV compatible Excel (bouton "Exporter CSV")

**Export CSV :**
1. Aller sur c-reussite.fr/admin.html
2. Saisir la clé d'accès
3. (Optionnel) Filtrer par année
4. Cliquer "Exporter CSV" — le fichier s'ouvre dans Excel

---

## Coûts des services

| Service | Rôle | Coût |
|---|---|---|
| **Stripe** | Paiement par carte | ~1,4% + 0,25 € par transaction (pas de frais fixe) |
| **Domaine c-reussite.fr** | Adresse du site | ~10-15 €/an |
| **Render** | Serveur backend | Gratuit (free tier permanent) |
| **Supabase** | Base de données | Gratuit jusqu'à 500 Mo — ~25 $/mois au-delà |
| **Brevo** | Envoi d'emails | Gratuit jusqu'à 9 000 emails/mois |
| **GitHub Pages** | Hébergement du site | Gratuit |

**Total fixe mensuel : ~1 €/mois** (domaine uniquement), hors commissions Stripe.

---

## Que faire si quelque chose ne fonctionne pas

| Symptôme | Où regarder | Qui intervient |
|---|---|---|
| Le site ne s'affiche plus | [dashboard.render.com](https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0) → logs | Développeur |
| Le paiement ne fonctionne plus | Tableau de bord Stripe + dashboard Render | Développeur |
| Les emails ne partent plus | Tableau de bord Brevo (quota dépassé ?) + logs Render | Développeur |
| Une commande semble manquante | [supabase.com/dashboard](https://supabase.com/dashboard) → table `orders` | Développeur |
| Alerte reçue par email | Contient les détails (session Stripe, email client, produit, erreur) | Développeur |

**Pour activer les alertes email en cas d'erreur** : configurer `ALERT_EMAIL` dans Render → Environment (le code est prêt, il manque juste la variable).

---

## Actions prioritaires

| Priorité | Action | Pourquoi |
|---|---|---|
| 1 | **Configurer `ALERT_EMAIL` dans Render** | Être prévenue immédiatement si une commande échoue — le code est prêt |
| 2 | **Compléter les mentions légales** (SIRET + adresse dans la page mentions-legales.html) | Obligation légale |
| 3 | **Configurer `BCC_EMAIL` dans Render** | Recevoir une copie de chaque email de commande |
| 4 | **Créer le bucket "invoices" dans Supabase Storage** | Activer l'archivage des factures (sans cela, les factures ne sont pas sauvegardées en dehors de l'admin) |

---

*Dernière synchronisation : 10 avril 2026*
