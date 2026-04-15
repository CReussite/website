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
│   ├── index.html                     ← Page d'accueil
│   ├── admin.html                     ← Tableau de bord (protégé ADMIN_KEY)
│   ├── beta.html                      ← Formulaire beta-testeurs (noindex)
│   ├── success.html                   ← Retour Stancer : vérifie paiement, affiche confirmation
│   ├── cancel.html                    ← Retour Stancer si annulation
│   ├── cgv.html / cgu.html / mentions-legales.html / confidentialite.html
│   ├── css/style.css
│   ├── js/
│   │   ├── payment.js                 ← POST /api/checkout, gestion modal paiement, sauvegarde paymentId
│   │   ├── nav.js                     ← Injection header (logo + liens + cadenas admin)
│   │   └── footer.js                  ← Injection footer
│   └── img/                           ← Couvertures, logo
│
├── backend/
│   ├── server.js                      ← Express, CORS, montage des routes
│   ├── routes/
│   │   ├── checkout.js                ← POST /api/checkout → paiement Stancer
│   │   ├── paymentConfirm.js          ← GET /api/payment/confirm → vérifie + traite commande
│   │   ├── extract.js                 ← POST /api/extract → extrait gratuit (sans stéganographie)
│   │   ├── admin.js                   ← GET /api/admin/* (protégé ADMIN_KEY)
│   │   └── beta.js                    ← POST /api/beta-feedback → email
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
| GET | `/api/products` | — | Retourne `docs/content/products.json` |
| GET | `/api/admin/orders` | ADMIN_KEY | Liste des commandes (JSON) |
| GET | `/api/admin/stats` | ADMIN_KEY | Stats agrégées (CA, nb commandes, emails) |
| GET | `/api/admin/extracts` | ADMIN_KEY | Historique des extraits envoyés |
| GET | `/api/admin/export` | ADMIN_KEY | Export CSV (BOM UTF-8) |
| GET | `/api/admin/invoice/:num` | ADMIN_KEY | Re-génère et télécharge une facture PDF |
| GET | `/api/admin/config` | ADMIN_KEY | Retourne `{ stripe_mode: 'live' \| 'test' }` |
| GET | `/api/health` | — | `{"status":"ok"}` |
| GET | `/api/healthz` | — | Health check détaillé, `503` si variable manquante |

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
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (`sb_secret_...`) |
| `BREVO_API_KEY` | brevo.com → Paramètres → Clés API (`xkeysib-...`) — PAS la clé SMTP |
| `FROM_EMAIL` | `contact@c-reussite.fr` |
| `FROM_NAME` | `C'Réussite` |
| `BCC_EMAIL` | Copie cachée de chaque email de commande + extrait |
| `ALERT_EMAIL` | Reçoit les alertes ops en cas d'erreur |
| `ADMIN_KEY` | Clé secrète pour `/admin.html`, valeur longue aléatoire |

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

---

## Stéganographie

| Contexte | Comportement |
| --- | --- |
| Extraits gratuits | Aucun marquage — PDFs envoyés bruts |
| PDFs payants | Email de l'acheteur inscrit 5x par page (texte blanc 4pt, opacité 0.004) + métadonnées PDF |

Pour identifier un PDF partagé illégalement : ouvrir dans Adobe Acrobat, `Ctrl+A`, copier dans un éditeur. L'email apparaît 5 fois par page.

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
| `tests/products.test.js` | Validité products.json | Non |
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
