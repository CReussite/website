# C'Réussite - Guide propriétaire

> Dernière mise à jour : 14 mai 2026

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
12. [Checklist juridique — passer en production](#12-checklist-juridique--passer-en-production)
13. [Actions prioritaires](#13-actions-prioritaires)

---

## 1. Le site en résumé

C'Réussite est une boutique automatisée : le client paie, reçoit ses fiches PDF par email dans les secondes qui suivent. Aucune intervention manuelle, 24h/24.

---

## 2. Les pages du site

### Pages produit et service

| Page | Adresse | Notes |
| --- | --- | --- |
| Accueil | c-reussite.fr/ | Hero 3 cartes produit, différenciation, FAQ, cours particuliers CTA |
| Ebook Maths | c-reussite.fr/maths-terminale/ | Layout empilé, tableau chapitres, FAQPage schema |
| Ebook Physique-Chimie | c-reussite.fr/physique-chimie-terminale/ | Idem, 32 fiches, formules+unités |
| Pack Maths + PC | c-reussite.fr/pack-maths-physique-chimie/ | Prix barré 29,98 €, 2 tableaux chapitres |
| Cours particuliers | c-reussite.fr/cours-particuliers/ | Service 30 €/h, formulaire de contact |
| Extrait gratuit | c-reussite.fr/extrait-gratuit/ | Choix Maths/PC/les deux, pré-sélection via ?matiere= |
| À propos | c-reussite.fr/a-propos/ | Bio Camille, catalogue, extrait discret |
| FAQ | c-reussite.fr/faq/ | Questions fréquentes générales |

### Ressources gratuites

| Page | Adresse |
| --- | --- |
| Hub maths | c-reussite.fr/fiches-maths-terminale/ |
| Hub physique-chimie | c-reussite.fr/fiches-physique-chimie-terminale/ |
| Guide cinétique chimique | c-reussite.fr/fiches-physique-chimie-terminale/cinetique-chimique/ |
| Guide calculer un pH | c-reussite.fr/fiches-physique-chimie-terminale/calculer-ph/ |
| Guide équilibre chimique | c-reussite.fr/fiches-physique-chimie-terminale/equilibre-chimique/ |
| Guide synthèse organique | c-reussite.fr/fiches-physique-chimie-terminale/synthese-organique/ |
| Guide tableau d'avancement | c-reussite.fr/fiches-physique-chimie-terminale/tableau-avancement/ |
| Blog (hub) | c-reussite.fr/blog/ |
| Article stress bac | c-reussite.fr/blog/stress-bac-anxiete-scolaire/ |
| Article chapitres ECE | c-reussite.fr/blog/chapitres-ece-physique-chimie-2026/ |
| Article préparer ECE | c-reussite.fr/blog/comment-se-preparer-aux-ece-physique-chimie/ |

### Pages techniques

| Page | Adresse | Notes |
| --- | --- | --- |
| Après paiement réussi | c-reussite.fr/success.html | Redirigé par Stancer |
| Après annulation | c-reussite.fr/cancel.html | Redirigé par Stancer |
| CGV | c-reussite.fr/cgv/ | |
| CGU | c-reussite.fr/cgu/ | |
| Mentions légales | c-reussite.fr/mentions-legales/ | ⚠️ SIRET et adresse à compléter |
| Politique de confidentialité | c-reussite.fr/confidentialite/ | |
| Tableau de bord admin | c-reussite.fr/admin.html | Protégé par `ADMIN_KEY` |

---

## 3. Le catalogue

| Produit | Prix | Ce qui est livré |
| --- | --- | --- |
| Fiches Maths Terminale Spécialité | 14,99 € | `fiches-maths.pdf` |
| Fiches Physique-Chimie Terminale Spécialité | 14,99 € | `fiches-physique-chimie.pdf` |
| Pack Maths + Physique-Chimie | 24,99 € | Les deux PDFs |

Des extraits gratuits existent pour Maths et Physique-Chimie. La page `/extrait-gratuit/` permet de choisir la matière (cases à cocher), avec pré-sélection automatique selon la page d'origine via le paramètre `?matiere=maths|physique|pack`.

### Modifier le catalogue

Toute modification du catalogue (prix, nom, ajout de produit) nécessite l'intervention d'un développeur. Ne jamais modifier un identifiant produit existant : les commandes passées y font référence.

---

## 4. Comment fonctionne une commande

1. Le client clique sur "Commander" et coche deux cases obligatoires (renonciation au droit de rétractation + CGV)
2. Il est redirigé vers la page de paiement sécurisée Stancer (`payment.stancer.com`). Les données bancaires ne transitent jamais par le site
3. Après paiement, Stancer redirige le client vers la page de confirmation du site (`success.html`)
4. La page de confirmation vérifie automatiquement le paiement auprès de Stancer, enregistre la commande, génère la facture, et envoie l'email avec les PDFs
5. Le client reçoit ses fichiers dans les secondes qui suivent

Si le paiement échoue ou est annulé, aucune commande n'est créée et aucun email n'est envoyé.

---

## 5. Ce que reçoit le client

Immédiatement après paiement, un email automatique contenant :

- Le ou les PDFs du produit acheté (avec traçage invisible, voir section 6)
- La facture PDF numérotée (format `CRE-2026-00001`)
- Le récapitulatif : produit, prix TTC, date, mentions légales

Une copie de chaque email est envoyée en copie cachée à l'adresse configurée dans `BCC_EMAIL` (variable Render).

---

## 6. Protection contre le partage illégal

| Contexte | Comportement |
| --- | --- |
| Extraits gratuits | Aucun marquage — PDFs envoyés bruts |
| PDFs payants | Email de l'acheteur inscrit 5x par page (texte blanc 4pt, invisible) + métadonnées PDF |

Chaque PDF livré est marqué invisiblement avant envoi. Le fichier est visuellement identique à l'original, mais l'email de l'acheteur y est inscrit en texte blanc taille 4pt, 5 fois par page. Indétectable à l'œil nu, résistant aux outils de nettoyage de métadonnées.

**Pour identifier l'origine d'un fichier partagé illégalement :** ouvrir le PDF dans Adobe Acrobat, faire `Ctrl+A`, copier dans un éditeur de texte. L'email apparaît 5 fois par page.

**Si l'acheteur a utilisé un faux email :** les coordonnées bancaires dans Stancer permettent une mise en demeure. Stancer conserve les données de paiement conformément à la réglementation PCI-DSS.

---

## 7. La facturation

- Numérotation séquentielle par année : `CRE-2026-00001`, `CRE-2026-00002`…
- Chaque facture contient : nom du vendeur (C'Réussite), email acheteur, produit, prix TTC, mention TVA (article 293 B du CGI), mention "Facture acquittée"
- Les factures sont archivées et re-téléchargeables à tout moment depuis le tableau de bord admin (bouton "PDF" par ligne)

---

## 8. Tableau de bord admin

Accès : **c-reussite.fr/admin.html**, saisir la clé `ADMIN_KEY` configurée dans Render.

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
4. Cliquer "Exporter CSV" — le fichier s'ouvre directement dans Excel

---

## 9. Coûts des services

| Service | Rôle | Coût |
| --- | --- | --- |
| **Stancer** | Paiement par carte | ~1,2% + 0,15 € par transaction (sans frais fixe) |
| **Domaine c-reussite.fr** | Adresse du site | ~10-15 €/an |
| **Render** | Serveur backend | Gratuit (free tier permanent) |
| **Supabase** | Base de données | Gratuit jusqu'à 500 Mo, ~25 $/mois au-delà |
| **Brevo** | Envoi d'emails | Gratuit jusqu'à 9 000 emails/mois |
| **GitHub Pages** | Hébergement du site | Gratuit |

**Total fixe mensuel : environ 1 €/mois** (domaine uniquement), hors commissions Stancer.

---

## 10. Que faire si quelque chose ne fonctionne pas

| Symptôme | Où regarder | Qui intervient |
| --- | --- | --- |
| Le site ne s'affiche plus | [dashboard.render.com](https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0) — onglet Logs | Développeur |
| Le paiement ne fonctionne plus | Tableau de bord Stancer + dashboard Render | Développeur |
| Les emails ne partent plus | Tableau de bord Brevo (quota dépassé ?) + logs Render | Développeur |
| Une commande semble manquante | [supabase.com/dashboard](https://supabase.com/dashboard) — table `orders` | Développeur |
| Alerte reçue par email | L'email contient tous les détails (session Stancer, email client, produit, erreur) | Développeur |

Pour activer les alertes email automatiques en cas d'erreur : configurer `ALERT_EMAIL` dans Render (le code est prêt, il manque juste cette variable).

---

## 11. Accès bêta-testeurs

Les pages `viewer-maths.html` et `viewer-physique.html` permettent à tes bêta-testeurs de consulter les vraies fiches PDF directement dans le navigateur, sans pouvoir les télécharger ni les copier. Un questionnaire de retour est intégré au début de chaque page.

### Donner l'accès à un bêta-testeur

L'accès se gère via la variable `BETA_VIEWER_PASSWORDS` dans Render. Il s'agit d'une liste au format JSON, à modifier manuellement dans le dashboard Render.

**Format :**

```json
[
  {"password":"motdepasse1","type":"maths","expires":"2026-05-15"},
  {"password":"motdepasse2","type":"physique","expires":"2026-05-15"},
  {"password":"motdepasse3","type":"bundle","expires":"2026-05-15"}
]
```

| Valeur `type` | Donne accès à |
| --- | --- |
| `maths` | Fiches Mathématiques uniquement |
| `physique` | Fiches Physique-Chimie uniquement |
| `bundle` | Les deux fiches |

**Procédure pour ajouter un accès :**

1. Aller sur [dashboard.render.com](https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0)
2. Cliquer sur "Environment" dans le menu de gauche
3. Trouver la variable `BETA_VIEWER_PASSWORDS` (la créer si elle n'existe pas encore)
4. Ajouter une entrée avec le mot de passe choisi, le type et la date d'expiration
5. Cliquer "Save Changes" — le serveur redémarre automatiquement (30 secondes)
6. Envoyer le lien et le mot de passe au bêta-testeur par email

**Procédure pour révoquer un accès :**
Supprimer la ligne correspondante dans `BETA_VIEWER_PASSWORDS`, sauvegarder. L'accès est coupé immédiatement après le redémarrage.

### Ce qui est protégé

Les fiches s'affichent dans le navigateur mais ne peuvent pas être téléchargées, copiées ou imprimées. La mention "PRÉVISUALISATION" est affichée en filigrane sur chaque page.

---

## 12. Checklist juridique — passer en production

Le site est actuellement configuré pour utiliser Stancer en mode production (`sprod_...`). Pour recevoir de vrais paiements, il faut finaliser le KYC (vérification d'identité) sur Stancer et s'assurer que le site est conforme.

### A. Informations à fournir à Stancer

Ces informations se renseignent sur [manage.stancer.com](https://manage.stancer.com/fr/) dans la section **"Mon compte"** ou **"KYC"**.

| Information | Détail | Statut |
| --- | --- | --- |
| **Forme juridique** | Auto-entrepreneur, SAS, SARL, association… | À renseigner |
| **Numéro SIREN / SIRET** | Identifiant de l'entreprise | À renseigner |
| **Adresse du siège social** | Adresse officielle de l'entreprise | À renseigner |
| **Description de l'activité** | Vente de fiches de révision PDF pour lycéens | À renseigner |
| **URL du site** | `https://c-reussite.fr` | ✅ Prêt |
| **Nom complet du représentant légal** | Prénom + nom | À renseigner |
| **Pièce d'identité** | Passeport ou carte nationale d'identité | À fournir |
| **IBAN français** | Compte bancaire pour recevoir les virements | À renseigner |

### B. Pages légales obligatoires sur le site

Ces pages existent déjà sur c-reussite.fr mais **certaines doivent être complétées** :

| Page | Adresse | Ce qu'il faut vérifier / compléter |
| --- | --- | --- |
| **Mentions légales** | c-reussite.fr/mentions-legales.html | ⚠️ **SIRET et adresse du siège à compléter** — obligatoire en France |
| **CGV** | c-reussite.fr/cgv.html | Vérifier que le nom de l'entreprise, le SIRET et les coordonnées y figurent |
| **CGU** | c-reussite.fr/cgu.html | ✅ Présente |
| **Politique de confidentialité** | c-reussite.fr/confidentialite.html | ✅ Conforme RGPD (Stancer mentionné, données anonymisées) |

### C. Obligations comptables et fiscales

| Obligation | Détail |
| --- | --- |
| **Déclaration de chiffre d'affaires** | Si auto-entrepreneur : déclaration mensuelle ou trimestrielle sur autoentrepreneur.urssaf.fr |
| **TVA** | Si micro-entreprise sous le seuil : mention "TVA non applicable, article 293 B du CGI" (✅ déjà sur les factures) |
| **Conservation des factures** | 10 ans minimum — les factures sont archivées dans Supabase Storage et re-téléchargeables depuis le tableau de bord admin |
| **Livre des recettes** | Obligatoire pour les auto-entrepreneurs — l'export CSV du tableau de bord admin peut servir de base |

### D. Procédure pour activer les vrais paiements

1. Aller sur [manage.stancer.com](https://manage.stancer.com/fr/)
2. Compléter le KYC avec les informations ci-dessus
3. Attendre la validation Stancer
4. Une fois validé : la clé de production (`sprod_...`) est déjà configurée dans Render — aucune action développeur supplémentaire n'est nécessaire

---

## 13. Actions prioritaires

| Priorité | Action | Pourquoi |
| --- | --- | --- |
| 🔴 1 | **Remplacer les PDFs placeholder dans `backend/assets/`** par les vrais fichiers, puis push | Les fichiers actuels sont des placeholders vides — aucun client ne recevra un vrai produit sans ça |
| 🔴 2 | **Compléter les mentions légales** (SIRET + adresse dans `/mentions-legales/`) | Obligation légale — page déjà en ligne |
| 🟠 3 | **Compléter le KYC Stancer** sur [manage.stancer.com](https://manage.stancer.com/fr/) | Nécessaire pour que les vrais paiements soient versés sur ton compte |
| 🟡 4 | **Configurer `ALERT_EMAIL` dans Render** | Être prévenue immédiatement si une commande échoue |
| 🟡 5 | **Configurer `BCC_EMAIL` dans Render** | Recevoir une copie de chaque email de commande |
| 🟡 6 | **Créer le bucket `invoices` dans Supabase Storage** | Sans ça, les factures ne sont pas archivées (re-génération depuis l'admin reste possible) |
| 🟡 7 | **Fusionner `feat/seo-pages-produits` sur `main`** | Toutes les pages produit refaites sont sur cette branche — le site live est sur `main` |

---

Dernière synchronisation : 14 mai 2026
