# C'Réussite - Documentation technique

Boutique de fiches de révision PDF. Flux : client paie via Stripe, webhook, Supabase, facture PDF, email Brevo.

---

## Architecture

```
Client
  │  POST /api/checkout  { product_id }
  ▼
Frontend (GitHub Pages - c-reussite.fr)
  ▼
Backend Express (Render - creussite-backend.onrender.com)
  │  crée Stripe Checkout Session, redirige le client
  ▼
Stripe Checkout
  │  checkout.session.completed
  ▼
POST /webhook
  ├─ vérifie signature Stripe
  ├─ insertOrderIdempotent() → Supabase (stripe_session_id UNIQUE)
  ├─ generateInvoice() → PDF en mémoire (PDFKit)
  ├─ stéganographie sur PDFs produits (pdf-lib - texte blanc 4pt, 5x/page)
  ├─ sendOrderEmail() → Brevo (PDFs + facture en pièces jointes)
  ├─ email_sent = true → Supabase
  ├─ upload facture → Supabase Storage (bucket "invoices")
  └─ sendAlert() → Brevo si erreur
```

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML/CSS/JS vanilla, sans framework |
| Hébergement frontend | GitHub Pages (CDN Fastly) |
| Backend | Node.js + Express |
| Hébergement backend | Render (free tier permanent) |
| Paiement | Stripe Checkout Sessions |
| Base de données | Supabase (PostgreSQL) |
| Emails | Brevo via sib-api-v3-sdk |
| Factures | PDFKit |
| Stéganographie | pdf-lib |

---

## Structure des fichiers

```
CReussite/
├── docs/                              ← GitHub Pages (site statique)
│   ├── CNAME                          ← c-reussite.fr
│   ├── content/products.json          ← SOURCE DE VÉRITÉ produits (lu par frontend + backend)
│   ├── index.html                     ← Page d'accueil
│   ├── admin.html                     ← Tableau de bord (protégé ADMIN_KEY)
│   ├── beta.html                      ← Formulaire beta-testeurs (noindex)
│   ├── success.html / cancel.html     ← Redirections Stripe
│   ├── cgv.html / cgu.html / mentions-legales.html / confidentialite.html
│   ├── css/style.css
│   ├── js/
│   │   ├── payment.js                 ← POST /api/checkout, gestion modal paiement
│   │   ├── nav.js                     ← Injection header (logo + liens + cadenas admin)
│   │   └── footer.js                  ← Injection footer
│   └── img/                           ← Couvertures, logo
│
├── backend/
│   ├── server.js                      ← Express, CORS, montage des routes
│   ├── routes/
│   │   ├── checkout.js                ← POST /api/checkout → Stripe Session
│   │   ├── webhook.js                 ← POST /webhook → pipeline complet
│   │   ├── extract.js                 ← POST /api/extract → extrait gratuit
│   │   ├── admin.js                   ← GET /api/admin/* (protégé ADMIN_KEY)
│   │   └── beta.js                    ← POST /api/beta-feedback → email
│   ├── services/
│   │   ├── db.js                      ← Client Supabase, insertOrderIdempotent()
│   │   ├── invoice.js                 ← Génération PDF facture (PDFKit)
│   │   ├── mailer.js                  ← Brevo : email commande + extraits
│   │   └── alerts.js                  ← Brevo : email d'alerte ops
│   ├── assets/                        ← PDFs produits + extraits
│   ├── tests/                         ← Tests node:test
│   ├── .env.example
│   └── package.json
│
├── supabase/migrations/               ← Migrations SQL (auto-appliquées via intégration GitHub)
├── .github/workflows/
│   ├── deploy.yml                     ← GitHub Pages auto-deploy
│   ├── deploy-render.yml              ← Render auto-deploy si backend/** modifié
│   └── backend-tests.yml              ← Tests sur chaque push
└── render.yaml                        ← Blueprint Render (rootDir: backend, plan: free)
```

---

## Routes API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/checkout` | - | Crée une Stripe Checkout Session, retourne l'URL |
| POST | `/webhook` | Stripe signature | Pipeline complet : DB, facture, email |
| POST | `/api/extract` | - | Envoie un extrait gratuit par email (avec stéganographie) |
| POST | `/api/beta-feedback` | - | Envoie les retours beta par email à `creussite2026@gmail.com` |
| GET | `/api/products` | - | Retourne `docs/content/products.json` |
| GET | `/api/admin/orders` | ADMIN_KEY | Liste des commandes (JSON) |
| GET | `/api/admin/stats` | ADMIN_KEY | Stats agrégées (CA, nb commandes, emails) |
| GET | `/api/admin/extracts` | ADMIN_KEY | Historique des extraits envoyés |
| GET | `/api/admin/export` | ADMIN_KEY | Export CSV (BOM UTF-8) |
| GET | `/api/admin/invoice/:num` | ADMIN_KEY | Re-génère et télécharge une facture PDF |
| GET | `/api/admin/config` | ADMIN_KEY | Retourne `{ stripe_mode: 'live' \| 'test' }` |
| GET | `/api/health` | - | `{"status":"ok"}` |
| GET | `/api/healthz` | - | Health check détaillé, `503` si variable manquante |

---

## Base de données

### Table `orders`

```sql
CREATE TABLE orders (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  product_id        text        NOT NULL,
  amount            integer     NOT NULL,           -- centimes
  stripe_session_id text        UNIQUE NOT NULL,    -- idempotence
  invoice_number    text        NOT NULL,           -- ex: 2026-001
  email_sent        boolean     DEFAULT false,      -- anti double livraison
  invoice_path      text,                           -- Supabase Storage, nullable
  created_at        timestamptz DEFAULT now()
);
```

Index : `email`, `stripe_session_id`, `invoice_number`, partiel sur `email_sent = false`.

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
|----------|----------------|
| `STRIPE_SECRET_KEY` | Stripe → Développeurs → Clés API (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Développeurs → Webhooks → Signing secret (`whsec_...`) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (`sb_secret_...`) |
| `BREVO_API_KEY` | brevo.com → Paramètres → Clés API (`xkeysib-...`) - PAS la clé SMTP |
| `FROM_EMAIL` | `contact@c-reussite.fr` |
| `FROM_NAME` | `C'Réussite` |
| `BCC_EMAIL` | Copie cachée de chaque email de commande + extrait |
| `ALERT_EMAIL` | Reçoit les alertes ops en cas d'erreur webhook |
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

## Stripe - webhook

1. Dashboard Stripe → Développeurs → Webhooks → Ajouter un endpoint
   - URL : `https://creussite-backend.onrender.com/webhook`
   - Événement : `checkout.session.completed`
2. Copier le Signing secret → `STRIPE_WEBHOOK_SECRET` dans Render

```bash
# Test local
stripe listen --forward-to localhost:3000/webhook
stripe trigger checkout.session.completed
```

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
Certificat Let's Encrypt généré automatiquement (~30 min après propagation DNS).

```bash
dig c-reussite.fr +short        # → 185.199.10[8-1].153
curl -sI https://c-reussite.fr | head -1  # → HTTP/2 200
```

---

## Tests

```bash
cd backend && npm test

# Test email réel (BREVO_API_KEY requis dans .env)
npm run test-email -- ton@email.fr maths
npm run test-email -- ton@email.fr bundle

# Tests Stripe live (STRIPE_SECRET_KEY requis)
STRIPE_SECRET_KEY=sk_live_... npm test
```

| Fichier | Ce qu'il teste | Credentials requis |
|---------|---------------|--------------------|
| `tests/invoice.test.js` | Génération facture PDF | Non |
| `tests/products.test.js` | Validité products.json | Non |
| `tests/webhook.test.js` | Pipeline webhook + idempotence | Non (mocks) |
| `tests/checkout.test.js` | Création session Stripe | Oui (skippé sans clé) |

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

# Webhook en local
stripe listen --forward-to localhost:3000/webhook
stripe trigger checkout.session.completed
```

Le frontend détecte automatiquement `localhost` et pointe sur `http://localhost:3000`.

---

## Comptes et dashboards

| Service | Dashboard |
|---------|-----------|
| GitHub | https://github.com/CReussite/website |
| Render | https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0 |
| Supabase | https://supabase.com/dashboard/project/llomqecxvbefakyysskn |
| Stripe | https://dashboard.stripe.com |
| Brevo | https://app.brevo.com |
| Site live | https://c-reussite.fr |
| Backend live | https://creussite-backend.onrender.com |
