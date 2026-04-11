# C'Réussite - Guide propriétaire

> Document rédigé pour Camille Reinhardt, sans connaissance technique requise.
> Dernière mise à jour : 11 avril 2026

---

## Sommaire

1. [Le site en résumé](#1-le-site-en-résumé)
2. [Les pages du site](#2-les-pages-du-site)
3. [Le catalogue](#3-le-catalogue)
4. [Comment fonctionne une commande](#4-comment-fonctionne-une-commande)
5. [Ce que reçoit le client](#5-ce-que-reçoit-le-client)
6. [Protection contre le partage illégal](#6-protection-contre-le-partage-illégal)
7. [La facturation](#7-la-facturation)
8. [Tableau de bord admin](#8-tableau-de-bord-admin)
9. [Coûts des services](#9-coûts-des-services)
10. [Que faire si quelque chose ne fonctionne pas](#10-que-faire-si-quelque-chose-ne-fonctionne-pas)
11. [Accès bêta-testeurs](#11-accès-bêta-testeurs)
12. [Actions prioritaires](#12-actions-prioritaires)

---

## 1. Le site en résumé

C'Réussite est une boutique automatisée : le client paie, reçoit ses fiches PDF par email dans les secondes qui suivent. Aucune intervention manuelle, 24h/24.

---

## 2. Les pages du site

| Page | Adresse | Visible publiquement ? |
|---|---|---|
| Page d'accueil | c-reussite.fr | Oui |
| Après paiement réussi | c-reussite.fr/success.html | Oui (redirigé par Stripe) |
| Après annulation | c-reussite.fr/cancel.html | Oui (redirigé par Stripe) |
| Conditions Générales de Vente | c-reussite.fr/cgv.html | Oui |
| Conditions Générales d'Utilisation | c-reussite.fr/cgu.html | Oui |
| Mentions légales | c-reussite.fr/mentions-legales.html | Oui - ⚠️ SIRET et adresse à compléter |
| Politique de confidentialité | c-reussite.fr/confidentialite.html | Oui |
| Formulaire bêta (Maths) | c-reussite.fr/viewer-maths.html | Protégé par mot de passe bêta-testeur |
| Formulaire bêta (Physique-Chimie) | c-reussite.fr/viewer-physique.html | Protégé par mot de passe bêta-testeur |
| Tableau de bord admin | c-reussite.fr/admin.html | Protégé par mot de passe (`ADMIN_KEY`) |

---

## 3. Le catalogue

| Produit | Prix | Ce qui est livré |
|---|---|---|
| Fiches Maths Terminale Spécialité | 14,99 € | `fiches-maths.pdf` |
| Fiches Physique-Chimie Terminale Spécialité | 14,99 € | `fiches-physique-chimie.pdf` |
| Pack Maths + Physique-Chimie | 24,99 € | Les deux PDFs |

Des extraits gratuits existent pour chaque produit, envoyés automatiquement quand un visiteur clique sur "Recevoir un extrait".

### Modifier le catalogue

Toute modification du catalogue (prix, nom, ajout de produit) nécessite l'intervention d'un développeur. Ne jamais modifier un identifiant produit existant : les commandes passées y font référence.

---

## 4. Comment fonctionne une commande

1. Le client clique sur "Commander" et coche deux cases obligatoires (renonciation au droit de rétractation + CGV)
2. Il est redirigé vers la page de paiement sécurisée Stripe. Les données bancaires ne transitent jamais par le site
3. Après paiement, Stripe notifie automatiquement le serveur
4. Le serveur enregistre la commande, génère la facture, et envoie l'email avec les PDFs
5. Le client reçoit ses fichiers dans les secondes qui suivent

Si le paiement échoue ou est annulé, aucune commande n'est créée et aucun email n'est envoyé.

---

## 5. Ce que reçoit le client

Immédiatement après paiement, un email automatique contenant :
- Le ou les PDFs du produit acheté (avec traçage invisible, voir section 6)
- La facture PDF numérotée (format `2026-001`)
- Le récapitulatif : produit, prix TTC, date, mentions légales

Une copie de chaque email est envoyée en copie cachée à l'adresse configurée dans `BCC_EMAIL` (variable Render).

---

## 6. Protection contre le partage illégal

Chaque PDF livré est marqué invisiblement avant envoi. Le fichier est visuellement identique à l'original, mais le nom et l'email de l'acheteur y sont inscrits en texte blanc taille 4pt, 5 fois par page. Indétectable à l'œil nu, résistant aux outils de nettoyage de métadonnées.

**Pour identifier l'origine d'un fichier partagé illégalement :** ouvrir le PDF dans Adobe Acrobat, faire `Ctrl+A`, copier dans un éditeur de texte. Le nom et l'email apparaissent 5 fois par page.

**Si l'acheteur a utilisé un faux nom ou un faux email :** les coordonnées bancaires dans Stripe sont suffisantes pour une mise en demeure. Stripe conserve les 4 derniers chiffres de la carte, le nom du titulaire et l'empreinte unique de la carte (`fingerprint`), qui ne sont pas falsifiables.

---

## 7. La facturation

- Numérotation séquentielle par année : `2026-001`, `2026-002`...
- Chaque facture contient : nom du vendeur (C'Réussite), email acheteur, produit, prix TTC, mention TVA (article 293 B du CGI), mention "Facture acquittée"
- Les factures sont archivées et re-téléchargeables à tout moment depuis le tableau de bord admin (bouton "PDF" par ligne)

---

## 8. Tableau de bord admin

Accès : **c-reussite.fr/admin.html**, saisir la clé `ADMIN_KEY` configurée dans Render.

Un bandeau jaune s'affiche si Stripe est en mode test (aucun vrai paiement possible dans ce cas).

**Ce qu'on y voit :**
- Nombre de commandes, chiffre d'affaires total, emails envoyés, commandes en attente
- Tableau complet des commandes (N° facture, date, email, produit, montant, statut email)
- Filtre par année

**Ce qu'on peut faire :**
- Télécharger une facture PDF (bouton "PDF" par ligne)
- Exporter toutes les commandes en CSV compatible Excel (bouton "Exporter CSV")

**Exporter les commandes en Excel :**
1. Aller sur c-reussite.fr/admin.html
2. Saisir la clé d'accès
3. Filtrer par année si besoin
4. Cliquer "Exporter CSV" - le fichier s'ouvre directement dans Excel

---

## 9. Coûts des services

| Service | Rôle | Coût |
|---|---|---|
| **Stripe** | Paiement par carte | ~1,4% + 0,25 € par transaction (pas de frais fixe) |
| **Domaine c-reussite.fr** | Adresse du site | ~10-15 €/an |
| **Render** | Serveur backend | Gratuit (free tier permanent) |
| **Supabase** | Base de données | Gratuit jusqu'à 500 Mo, ~25 $/mois au-delà |
| **Brevo** | Envoi d'emails | Gratuit jusqu'à 9 000 emails/mois |
| **GitHub Pages** | Hébergement du site | Gratuit |

**Total fixe mensuel : environ 1 €/mois** (domaine uniquement), hors commissions Stripe.

---

## 10. Que faire si quelque chose ne fonctionne pas

| Symptôme | Où regarder | Qui intervient |
|---|---|---|
| Le site ne s'affiche plus | [dashboard.render.com](https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0) - onglet Logs | Développeur |
| Le paiement ne fonctionne plus | Tableau de bord Stripe + dashboard Render | Développeur |
| Les emails ne partent plus | Tableau de bord Brevo (quota dépassé ?) + logs Render | Développeur |
| Une commande semble manquante | [supabase.com/dashboard](https://supabase.com/dashboard) - table `orders` | Développeur |
| Alerte reçue par email | L'email contient tous les détails (session Stripe, email client, produit, erreur) | Développeur |

Pour activer les alertes email automatiques en cas d'erreur : configurer `ALERT_EMAIL` dans Render (le code est prêt, il manque juste cette variable).

---

## 11. Accès bêta-testeurs

Les pages `viewer-maths.html` et `viewer-physique.html` permettent à tes bêta-testeurs de consulter les vraies fiches PDF directement dans le navigateur, sans pouvoir les télécharger ni les copier. Un questionnaire de retour est intégré au début de chaque page.

### Donner l'accès à un bêta-testeur

L'accès se gère via la variable `BETA_VIEWER_PASSWORDS` dans Render. Il s'agit d'une liste au format JSON, à modifier manuellement dans le dashboard Render.

**Format :**
```
[
  {"password":"motdepasse1","type":"maths","expires":"2026-05-15"},
  {"password":"motdepasse2","type":"physique","expires":"2026-05-15"},
  {"password":"motdepasse3","type":"bundle","expires":"2026-05-15"}
]
```

| Valeur `type` | Donne accès à |
|---|---|
| `maths` | Fiches Mathématiques uniquement |
| `physique` | Fiches Physique-Chimie uniquement |
| `bundle` | Les deux fiches |

**Procédure pour ajouter un accès :**
1. Aller sur [dashboard.render.com](https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0)
2. Cliquer sur "Environment" dans le menu de gauche
3. Trouver la variable `BETA_VIEWER_PASSWORDS` (la créer si elle n'existe pas encore)
4. Ajouter une entrée avec le mot de passe choisi, le type et la date d'expiration
5. Cliquer "Save Changes" - le serveur redémarre automatiquement (30 secondes)
6. Envoyer le lien et le mot de passe au bêta-testeur par email

**Procédure pour révoquer un accès :**
Supprimer la ligne correspondante dans `BETA_VIEWER_PASSWORDS`, sauvegarder. L'accès est coupé immédiatement après le redémarrage.

### Ce qui est protégé

Les fiches s'affichent dans le navigateur mais ne peuvent pas être téléchargées, copiées ou imprimées. La mention "PRÉVISUALISATION" est affichée en filigrane sur chaque page.

---

## 12. Actions prioritaires

| Priorité | Action | Pourquoi |
|---|---|---|
| 1 | **Configurer `BETA_VIEWER_PASSWORDS` dans Render** | Activer l'accès bêta-testeurs aux fiches PDF (voir section 11) |
| 2 | **Configurer `ALERT_EMAIL` dans Render** | Être prévenue immédiatement si une commande échoue. Le code est prêt |
| 3 | **Compléter les mentions légales** (SIRET + adresse dans mentions-legales.html) | Obligation légale |
| 4 | **Configurer `BCC_EMAIL` dans Render** | Recevoir une copie de chaque email de commande |
| 5 | **Créer le bucket "invoices" dans Supabase Storage** | Activer l'archivage des factures (sans cela, les factures ne sont pas sauvegardées en dehors de l'admin) |

---

*Dernière synchronisation : 11 avril 2026*
