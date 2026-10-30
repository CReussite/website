# C'Réussite - Documentation technique

Boutique de fiches de révision PDF. Flux : client paie via Stancer, retour sur success.html, vérification API, Supabase, facture PDF, email Brevo.

---

## Architecture

```text
Client
  │  POST /api/checkout  { product_id }
  ▼
Backend Express (Render - creussite-backend.onrender.com)
  │  crée un paiement Stancer, retourne l'URL de paiement + paymentId
  ▼
Page de paiement Stancer (payment.stancer.com)
  │  client paie, Stancer redirige vers success.html
  ▼
success.html (frontend)
  │  GET /api/payment/confirm?id={paymentId}
  ▼
Backend Express
  ├─ vérifie le paiement via l'API Stancer (GET /v1/payment/{id})
  ├─ insertOrderIdempotent() → Supabase (payment_session_id UNIQUE)
  ├─ generateInvoice() → PDF en mémoire (PDFKit)
  ├─ stéganographie sur PDFs produits (pdf-lib — email seul, texte blanc 4pt, 5x/page)
  ├─ sendOrderEmail() → Brevo (PDFs + facture en pièces jointes)
  ├─ email_sent = true → Supabase
  ├─ upload facture → Supabase Storage (bucket "invoices")
  └─ sendAlert() → Brevo si erreur
```

---

## Stack

| Couche | Technologie |
| ------ | ----------- |
| Frontend | HTML/CSS/JS vanilla, sans framework |
| Hébergement frontend | GitHub Pages (CDN Fastly) |
| Backend | Node.js + Express |
| Hébergement backend | Render (free tier permanent) |
| Paiement | Stancer (page hébergée + vérification API) |
| Base de données | Supabase (PostgreSQL) |
| Emails | Brevo via sib-api-v3-sdk |
| Factures | PDFKit |
| Stéganographie PDFs payants | pdf-lib |

---

## Structure des fichiers

```text
CReussite/
├── docs/                              ← GitHub Pages (site statique)
│   ├── CNAME                          ← c-reussite.fr
│   ├── content/products.json          ← SOURCE DE VÉRITÉ produits (lu par frontend + backend)
│   ├── sitemap.xml
│   ├── llms.txt                       ← Index lisible par LLM
│   ├── index.html                     ← Page d'accueil
│   ├── admin.html                     ← Tableau de bord (protégé 2FA : mot de passe + TOTP/email)
│   ├── success.html                   ← Retour Stancer : vérifie paiement, affiche confirmation
│   ├── cancel.html                    ← Retour Stancer si annulation
│   ├── beta.html                      ← Bêta multi-niveaux : connexion + grille + lecteur PDF
│   ├── maths-terminale/index.html     ← Page produit Maths (layout empilé, FAQPage schema)
│   ├── physique-chimie-terminale/index.html ← Page produit Physique-Chimie
│   ├── pack-maths-physique-chimie/index.html ← Page produit Pack (prix barré, 2 tableaux)
│   ├── cours-particuliers/index.html  ← Page service cours particuliers
│   ├── extrait-gratuit/index.html     ← Landing capture email, choix Maths/PC/?matiere=
│   ├── a-propos/index.html
│   ├── faq/index.html
│   ├── fiches-maths-terminale/index.html       ← Hub maths (guides gratuits)
│   ├── fiches-physique-chimie-terminale/
│   │   ├── index.html                 ← Hub physique-chimie
│   │   ├── cinetique-chimique/index.html
│   │   ├── calculer-ph/index.html
│   │   ├── equilibre-chimique/index.html
│   │   ├── synthese-organique/index.html
│   │   └── tableau-avancement/index.html
│   ├── blog/
│   │   ├── index.html                 ← Hub blog (4 catégories, filtre JS)
│   │   ├── stress-bac-anxiete-scolaire/index.html
│   │   ├── chapitres-ece-physique-chimie-2026/index.html
│   │   └── comment-se-preparer-aux-ece-physique-chimie/index.html
│   ├── cgv/ cgu/ mentions-legales/ confidentialite/
│   ├── css/style.css                  ← Styles globaux (incl. payment modal CSS)
│   ├── js/
│   │   ├── payment.js                 ← POST /api/checkout, modal paiement
│   │   ├── nav.js                     ← Injection header (dropdown Ressources, burger mobile)
│   │   ├── footer.js                  ← Injection footer
│   │   ├── toc.js                     ← TOC auto-générée (articles blog + guides chapitre)
│   │   ├── carousel.js                ← Carousel images produit
│   │   ├── extract.js                 ← Formulaire extrait gratuit
│   │   ├── avis.js / review.js        ← Témoignages et formulaire avis
│   │   └── schema.js                  ← JSON-LD homepage
│   └── img/
│       ├── carousel/maths/            ← Images carousel ebook maths (webp + png)
│       ├── carousel/physique/         ← Images carousel ebook physique-chimie
│       └── carousel/bundle/           ← Images carousel pack
│
├── backend/
│   ├── server.js                      ← Express, CORS, montage des routes
│   ├── routes/
│   │   ├── checkout.js                ← POST /api/checkout → paiement Stancer
│   │   ├── paymentConfirm.js          ← GET /api/payment/confirm → vérifie + traite commande
│   │   ├── extract.js                 ← POST /api/extract → extrait gratuit (sans stéganographie)
│   │   ├── admin.js                   ← GET /api/admin/* (protégé jeton de session 2FA)
│   │   ├── adminAuth.js               ← POST /api/admin/auth/* (2FA : login + TOTP/email)
│   │   ├── beta.js                    ← POST /api/beta-feedback → email
│   │   ├── betaViewer.js              ← Bêta maths/physique : auth mot de passe + PDF Supabase
│   │   └── betaNiveaux.js             ← Bêta multi-niveaux : auth email+mdp, 4 ebooks, questionnaire
│   ├── services/
│   │   ├── db.js                      ← Client Supabase, insertOrderIdempotent()
│   │   ├── invoice.js                 ← Génération PDF facture (PDFKit)
│   │   ├── mailer.js                  ← Brevo : email commande (stéganographie email seul) + extraits
│   │   └── alerts.js                  ← Brevo : email d'alerte ops
│   ├── assets/                        ← PDFs produits + extraits
│   ├── tests/                         ← Tests node:test
│   ├── .env.example
│   └── package.json
│
├── supabase/migrations/               ← Migrations SQL (auto-appliquées via intégration GitHub)
├── supabase/manual/                   ← Migrations à exécuter manuellement (ex: purge test)
├── .github/workflows/
│   ├── deploy.yml                     ← GitHub Pages auto-deploy
│   ├── deploy-render.yml              ← Render auto-deploy si backend/** modifié
│   └── backend-tests.yml              ← Tests sur chaque push
└── render.yaml                        ← Blueprint Render (rootDir: backend, plan: free)
```

---

## Routes API

| Méthode | Route | Auth | Description |
| ------- | ----- | ---- | ----------- |
| POST | `/api/checkout` | — | Crée un paiement Stancer, retourne `{ url, paymentId }` |
| GET | `/api/payment/confirm` | — | Vérifie paiement Stancer, insère commande, envoie email |
| POST | `/api/extract` | — | Envoie un extrait gratuit par email (sans stéganographie) |
| POST | `/api/beta-feedback` | — | Envoie les retours beta par email |
| POST | `/api/beta-niveaux/auth` | BETA_TESTERS | Connexion bêta multi-niveaux (email + mot de passe) |
| GET | `/api/beta-niveaux/pdf/:type` | jeton | Sert un ebook depuis Supabase Storage (bucket `beta-assets`) |
| GET | `/api/products` | — | Retourne `docs/content/products.json` |
| POST | `/api/admin/auth/login` | mot de passe | Vérifie `ADMIN_KEY`, renvoie l'étape 2FA + un ticket `preauth` |
| POST | `/api/admin/auth/setup` + `/setup/confirm` | preauth | 1re config TOTP (QR code) puis activation |
| POST | `/api/admin/auth/verify` | preauth | Vérifie le code TOTP, délivre le jeton de session |
| POST | `/api/admin/auth/email-otp` + `/email-otp/verify` | preauth | Secours : code à usage unique envoyé par email |
| GET | `/api/admin/orders` | jeton 2FA | Liste des commandes (JSON) |
| GET | `/api/admin/stats` | jeton 2FA | Stats agrégées (CA, nb commandes, emails) |
| GET | `/api/admin/extracts` | jeton 2FA | Historique des extraits envoyés |
| GET | `/api/admin/export` | jeton 2FA | Export CSV (BOM UTF-8) |
| GET | `/api/admin/invoice/:num` | jeton 2FA | Re-génère et télécharge une facture PDF |
| GET | `/api/admin/next-invoice-number` | jeton 2FA | Prochain numéro de facture disponible (`max + 1`) |
| GET | `/api/admin/config` | jeton 2FA | Retourne `{ stancer_mode: 'live' \| 'test' }` |
| GET | `/api/health` | — | `{"status":"ok"}` |
| GET | `/api/healthz` | — | Health check détaillé, `503` si variable manquante |

---

## Authentification admin (double authentification)

L'accès à `/admin.html` est protégé par **2FA** : mot de passe (`ADMIN_KEY`) **puis** un
second facteur. Le mot de passe seul ne donne plus accès.

- **1er facteur** : le mot de passe `ADMIN_KEY`.
- **2e facteur** : un code à 6 chiffres d'une app authenticator (TOTP, type Google
  Authenticator), **ou** un code à usage unique envoyé par email (`ADMIN_EMAIL`) en secours.
- Après validation des deux facteurs, le backend délivre un **jeton de session signé
  (HMAC-SHA256 avec `ADMIN_KEY`) valable 12 h**. Ce jeton — et non plus la clé brute —
  est stocké dans le navigateur et envoyé aux routes `/api/admin/*`. Il est *sans état*
  (aucune table de session) et une rotation de `ADMIN_KEY` invalide tous les jetons.
- Le secret TOTP est stocké dans la table `admin_settings` (clé `totp_secret`). À la
  première connexion, l'écran propose de scanner un QR code pour l'activer.
- Code backend : `backend/services/adminAuth.js` (jetons + TOTP + middleware
  `requireSession`) et `backend/routes/adminAuth.js` (routes `/api/admin/auth/*`).

**Récupération (perte du téléphone ET de l'accès email)** : dans Supabase, table
`admin_settings`, supprimer la ligne `totp_secret` (ou vider sa `value`). À la connexion
suivante, après le mot de passe, l'écran de configuration réapparaît pour réassocier une
nouvelle application authenticator.

---

## Base de données

### Table `orders`

```sql
CREATE TABLE orders (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text        NOT NULL,
  product_id         text        NOT NULL,
  amount             integer     NOT NULL,           -- centimes
  payment_session_id text        UNIQUE NOT NULL,    -- idempotence (ID paiement Stancer)
  invoice_number     text        NOT NULL,           -- ex: CRE-2026-00001
  email_sent         boolean     DEFAULT false,      -- anti double livraison
  invoice_path       text,                           -- Supabase Storage, nullable
  created_at         timestamptz DEFAULT now()
);
```

Index : `email`, `payment_session_id`, `invoice_number`, partiel sur `email_sent = false`.

**Numérotation des factures** — `CRE-{année}-{NNNNN}`, séquence partagée entre ebooks (`orders`) et cours particuliers (`cp_invoices`). Le prochain numéro est calculé comme `max(numéro existant de l'année) + 1` (et non le nombre de lignes), ce qui garantit une séquence strictement croissante même après suppression d'une facture. Voir `nextInvoiceNumber()` dans `backend/services/db.js`. L'endpoint `GET /api/admin/next-invoice-number` est appelé en `no-store` côté `facture-cp.html` pour éviter qu'un numéro mis en cache par le navigateur réaffiche le précédent. `facture-cp.html` bloque l'impression si l'enregistrement en base échoue, pour ne jamais émettre un PDF sans facture correspondante (sinon trou de numérotation).

**Factures cours particuliers (`cp_invoices`)** — une facture est « à régler » si son `payment_method` vaut `À payer` **ou** si au moins une ligne (`items[].status`) vaut `a_payer`. `markCpInvoicePaid()` solde le niveau facture **et** chaque ligne (sinon la facture resterait affichée « À régler »). Le filigrane diagonal `ACQUITTÉE` n'est apposé que sur une facture qui était « à régler » puis soldée (détection via présence d'un RIB) ; une facture née déjà payée s'affiche sans filigrane.

### Table `extract_requests`

```sql
CREATE TABLE extract_requests (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,   -- toujours 'anonyme' (RGPD)
  product_id text        NOT NULL,
  source     text        DEFAULT 'website',
  sent_at    timestamptz DEFAULT now()
);
```

### Requêtes utiles

```sql
-- Commandes récentes
SELECT invoice_number, created_at, email, product_id, amount/100.0 AS eur, email_sent
FROM orders ORDER BY created_at DESC LIMIT 20;

-- Commandes non livrées
SELECT * FROM orders WHERE email_sent = false;

-- CA par année
SELECT EXTRACT(YEAR FROM created_at) AS annee, SUM(amount)/100.0 AS ca
FROM orders GROUP BY annee ORDER BY annee DESC;
```

---

## Variables d'environnement (Render)

```bash
cp backend/.env.example backend/.env  # en local
```

| Variable | Source / valeur |
| -------- | -------------- |
| `STANCER_SECRET_KEY` | manage.stancer.com → Développeurs → Clés d'API → Privée (`stest_...` ou `sprod_...`) |
| `STANCER_PUBLIC_KEY` | manage.stancer.com → Développeurs → Clés d'API → Publique (`ptest_...` ou `pprod_...`) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (`sb_secret_...`) |
| `BREVO_API_KEY` | brevo.com → Paramètres → Clés API (`xkeysib-...`) — PAS la clé SMTP |
| `FROM_EMAIL` | `contact@c-reussite.fr` |
| `FROM_NAME` | `C'Réussite` |
| `BCC_EMAIL` | Copie cachée de chaque email de commande + extrait |
| `NOTIFY_EMAIL` | Destinataire interne des notifications (avis, retours bêta) ; repli du BCC |
| `ALERT_EMAIL` | Reçoit les alertes ops en cas d'erreur |
| `ADMIN_KEY` | Mot de passe admin (1er facteur 2FA) + clé de signature des jetons de session, valeur longue aléatoire |
| `ADMIN_EMAIL` | Destinataire du code admin de secours (2FA email) ; défaut `ALERT_EMAIL`/`FROM_EMAIL` |
| `BETA_VIEWER_PASSWORDS` | JSON bêta maths/physique : `[{"password","type","expires"}]` |
| `BETA_TESTERS` | JSON bêta multi-niveaux : `[{"email","password","expires"}]` (accès aux 4 ebooks) |

### Garde-fou secrets (hook pre-commit)

Le dépôt est **public** : aucun secret ni fichier `.env` ne doit être commité. Un hook `.githooks/pre-commit` bloque automatiquement ces commits (fichiers `.env` et clés réelles Stancer/Brevo/Supabase, clés privées PEM, IBAN). À activer une fois par clone :

```bash
git config core.hooksPath .githooks
```

Faux positif assumé : `git commit --no-verify`.

---

## Déploiement

Tout push sur `main` déclenche automatiquement :
- **Frontend** : `deploy.yml` → GitHub Pages
- **Backend** : `deploy-render.yml` → Render (uniquement si `backend/**` ou `products.json` modifié)
- **Migrations DB** : Supabase GitHub integration → `supabase/migrations/`

```bash
# Vérifier que le backend est en ligne
curl https://creussite-backend.onrender.com/api/healthz
```

Build Render : `npm ci --omit=dev` / Start : `node server.js`

### Mettre à jour les PDFs produit

Les PDFs sont stockés dans Supabase Storage (pas dans git). Pour les remplacer :

1. Copier les nouveaux fichiers dans `backend/assets/` (en respectant les noms existants)
2. Lancer le script d'upload :

```bash
cd backend && node scripts/upload-assets.js
```

Aucun commit ni redéploiement nécessaire — la mise à jour est immédiate.

---

## Flux de paiement Stancer

1. `POST /api/checkout` crée un paiement via l'API Stancer et retourne `{ url, paymentId }`
2. `payment.js` sauvegarde `paymentId` dans `localStorage` puis redirige vers `url`
3. Le client paie sur la page hébergée Stancer (`payment.stancer.com/{key}/{id}`)
4. Stancer redirige vers `success.html`
5. `success.html` appelle `GET /api/payment/confirm?id={paymentId}`
6. Le backend vérifie le statut via `GET https://api.stancer.com/v1/payment/{id}`
7. Si `status === 'captured'` : insertion DB, génération facture, envoi email

**Stancer n'a pas de webhooks** — la confirmation se fait uniquement via la vérification API au retour du client.

### Réconciliation et surveillance (cron horaire)

Au démarrage (après 5 min) puis toutes les heures, `server.js` lance `runHourlyMaintenance()` :

1. `syncUnconfirmedPayments()` ([stancerSync.js](backend/services/stancerSync.js)) — rattrape les paiements capturés chez Stancer mais non confirmés par `success.html` (client qui ferme l'onglet) : insère la commande, génère la facture, envoie l'email.
2. `alertStuckOrders()` — si des commandes restent payées mais non livrées (`email_sent = false` depuis > 1 h, donc après échec de la réconciliation), envoie **une** alerte email explicite à `ALERT_EMAIL` via Brevo. Anti-spam : chaque commande n'est signalée qu'une fois (liste persistée dans `admin_settings.stuck_orders_alerted`).

Le health check `GET /api/healthz` renvoie `stuck_orders` (commandes `email_sent = false` depuis > 10 min) et un statut `503 degraded` si > 0 — surveillé par UptimeRobot.

---

## Stéganographie

| Contexte | Comportement |
| --- | --- |
| Extraits gratuits | Aucun marquage — PDFs envoyés bruts |
| PDFs payants | Email de l'acheteur inscrit 5x par page (texte blanc 4pt, opacité 0.004) + métadonnées PDF |

Pour identifier un PDF partagé illégalement : ouvrir dans Adobe Acrobat, `Ctrl+A`, copier dans un éditeur. L'email apparaît 5 fois par page.

---

## Bêta multi-niveaux (module indépendant)

Module isolé pour une nouvelle vague de bêta-testeurs, sans impact sur la bêta maths/physique existante. Backend : `backend/routes/betaNiveaux.js`, monté sur `/api/beta-niveaux`. Frontend : `docs/beta.html` (connexion + grille + lecteur).

### Les ebooks

Stockés dans Supabase Storage, bucket privé `beta-assets` (jamais dans git), servis uniquement après connexion :

| Clé | Fichier bucket |
| --- | --- |
| `pc-2nde` | `pc-2nde.pdf` |
| `pc-1ere` | `pc-1ere.pdf` |
| `maths-terminale` | `maths-terminale.pdf` |

Déposer ou remplacer les PDF : placer les fichiers dans `backend/assets/` (local, hors git) avec ces noms exacts, puis `cd backend && node scripts/upload-assets.js`.

### Comptes testeurs

Variable d'environnement `BETA_TESTERS` (Render), tableau JSON. Un compte donne accès à tous les ebooks. Les mots de passe doivent être uniques.

```json
[
  { "email": "marie@exemple.fr", "password": "mdp-unique-1", "expires": "2026-06-30" },
  { "email": "lucas@exemple.fr", "password": "mdp-unique-2", "expires": "2026-06-30" }
]
```

### Lecteur

- Navigation page à page, plein écran avec zoom, swipe mobile.
- **Sommaire latéral** (panneau repliable à gauche) : vraie liste de chapitres reconstruite en texte (titres de section + fiches cliquables + n° de page, page courante surlignée), disponible en vue normale **et** en plein écran (tiroir qui se referme après sélection). Les PDF n'ayant pas de signets `/Outlines`, la page sommaire est détectée comme celle qui contient « sommaire » **et** a le plus de liens internes (`buildTOC`), puis les entrées sont extraites lien par lien (`extractTOC`). Les liens internes synchronisent aussi le plein écran (`navigateToPage`).

### Protections

- Impression et téléchargement désactivés (PDF rendu en canvas via pdf.js, aucun fichier exposé).
- Clic droit, Ctrl+P/S/U et F12 bloqués. PDF servi seulement après connexion, sans URL devinable.
- Filigrane peu perceptible répété sur chaque page : mention « BÊTA TEST », pour signaler clairement la version de test (une capture d'écran reste techniquement possible).

---

## DNS - domaine c-reussite.fr (OVH)

```
Type    Sous-domaine    Valeur                    TTL
A       @               185.199.108.153           3600
A       @               185.199.109.153           3600
A       @               185.199.110.153           3600
A       @               185.199.111.153           3600
CNAME   www             creussite.github.io.      3600
```

GitHub → Settings → Pages : Custom domain `c-reussite.fr` + Enforce HTTPS.

---

## Tests

```bash
cd backend && npm test

# Test email réel (BREVO_API_KEY requis dans .env)
npm run test-email -- ton@email.fr maths
npm run test-email -- ton@email.fr bundle

# Tests Stancer live (STANCER_SECRET_KEY requis)
STANCER_SECRET_KEY=stest_... npm test
```

| Fichier | Ce qu'il teste | Credentials requis |
| ------- | ------------- | ------------------ |
| `tests/invoice.test.js` | Génération facture PDF | Non |
| `tests/invoice-number.test.js` | Numérotation factures (`max + 1`, pas de doublon) | Non |
| `tests/products.test.js` | Validité products.json + flux Google Merchant | Non |
| `tests/webhook.test.js` | Pipeline commande + idempotence | Non (mocks) |
| `tests/checkout.test.js` | Création paiement Stancer | Oui (skippé sans clé) |
| `tests/alerts.test.js` | Formatage alertes ops | Non |

---

## Dev local

```bash
# Frontend
python lance_site.py   # ou tout serveur HTTP statique sur docs/

# Backend
cd backend
cp .env.example .env   # remplir les variables
npm install
npm run dev            # → http://localhost:3000/api/health
```

---

## Comptes et dashboards

| Service | Dashboard |
| ------- | --------- |
| GitHub | <https://github.com/CReussite/website> |
| Render | <https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0> |
| Supabase | <https://supabase.com/dashboard/project/llomqecxvbefakyysskn> |
| Stancer | <https://manage.stancer.com/fr/> |
| Brevo | <https://app.brevo.com> |
| Site live | <https://c-reussite.fr> |
| Backend live | <https://creussite-backend.onrender.com> |
