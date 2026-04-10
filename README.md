# C'Réussite — Vente de fiches de révision

Flux complet : l'utilisateur paie → Stripe Checkout → webhook → Supabase → facture PDF → email Brevo.

---

## Architecture

```
Acheteur
  │  clique "Commander"
  ▼
Frontend (GitHub Pages — c-reussite.fr)
  │  POST /api/checkout  { product_id }
  ▼
Backend Express (Render — creussite-backend.onrender.com)
  │  crée une Stripe Checkout Session
  ▼
Stripe Checkout
  │  checkout.session.completed
  ▼
Backend /webhook
  ├─ vérifie signature Stripe
  ├─ insert orders dans Supabase (idempotent via stripe_session_id UNIQUE)
  ├─ génère facture PDF (PDFKit)
  └─ envoie email via Brevo
       ├─ PDF(s) produit en pièce jointe
       └─ facture PDF en pièce jointe
```

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML/CSS/JS vanilla |
| Hébergement frontend | GitHub Pages (CDN Fastly, gratuit) |
| Backend | Node.js + Express (Render free tier) |
| Paiement | Stripe Checkout Sessions |
| Base de données | Supabase (PostgreSQL) |
| Emails | Brevo (sib-api-v3-sdk) |
| Factures | PDFKit |

---

## Fichiers clés

```
CReussite/
├── docs/                          ← GitHub Pages (site statique)
│   ├── CNAME                      ← c-reussite.fr
│   ├── content/products.json      ← SOURCE DE VÉRITÉ produits
│   ├── index.html
│   ├── success.html
│   ├── cancel.html
│   └── js/payment.js              ← POST vers /api/checkout
│
├── backend/
│   ├── server.js                  ← Express + CORS
│   ├── routes/
│   │   ├── checkout.js            ← POST /api/checkout → Stripe Session
│   │   ├── webhook.js             ← POST /webhook → DB + invoice + email
│   │   ├── extract.js             ← POST /api/extract → extrait gratuit par email
│   │   ├── admin.js               ← GET /api/admin/* (orders, stats, export, invoice, config)
│   │   └── beta.js                ← POST /api/beta-feedback → email à creussite2026@gmail.com
│   ├── services/
│   │   ├── db.js                  ← Supabase (insert idempotent)
│   │   ├── invoice.js             ← Génération PDF facture (PDFKit)
│   │   ├── mailer.js              ← Brevo (PDF produit + facture)
│   │   └── alerts.js              ← Email d'alerte ops sur erreur webhook
│   ├── assets/                    ← PDFs produits + extraits
│   ├── tests/                     ← Tests node:test
│   └── .env.example
│
├── .github/workflows/
│   ├── deploy.yml                 ← GitHub Pages auto-deploy
│   ├── deploy-render.yml          ← Render auto-deploy (si backend/** modifié)
│   └── backend-tests.yml          ← Tests automatiques sur chaque push
└── render.yaml                   ← Config Render (rootDir: backend, plan: free)
```

---

## Produits (source unique)

Tout produit est défini **une seule fois** dans `docs/content/products.json`.
Le backend et le frontend lisent tous les deux ce fichier.

```json
[
  { "id": "maths",    "name": "Fiches Maths Terminale Spécialité",          "price": 1499, "pdf_files": ["fiches-maths.pdf"],                                       "extract_files": ["extrait-maths.pdf"] },
  { "id": "physique", "name": "Fiches Physique-Chimie Terminale Spécialité", "price": 1499, "pdf_files": ["fiches-physique-chimie.pdf"],                               "extract_files": ["extrait-physique-chimie.pdf"] },
  { "id": "bundle",   "name": "Pack Maths + Physique-Chimie",               "price": 2499, "pdf_files": ["fiches-maths.pdf", "fiches-physique-chimie.pdf"],             "extract_files": ["extrait-maths.pdf", "extrait-physique-chimie.pdf"] }
]
```

**Ajouter un produit** : modifier `products.json` + déposer le PDF dans `backend/assets/` + ajouter l'article dans `docs/index.html`. C'est tout.

---

## Variables d'environnement (Render)

Copier `backend/.env.example`, remplir chaque valeur, puis les ajouter dans Render → Environment.

| Variable | Source / valeur |
|----------|----------------|
| `STRIPE_SECRET_KEY` | Stripe → Développeurs → Clés API |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Développeurs → Webhooks → Signing secret |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `BREVO_API_KEY` | brevo.com → Paramètres → Clés API |
| `FROM_EMAIL` | `contact@c-reussite.fr` |
| `FROM_NAME` | `C'Réussite` |
| `BCC_EMAIL` | Adresse en copie cachée de chaque email de commande (ex: `creussite2026@gmail.com`) |
| `ALERT_EMAIL` | Adresse qui reçoit les alertes en cas d'erreur backend |
| `ADMIN_KEY` | Clé secrète pour accéder à `/admin.html` — choisir une valeur longue aléatoire |

```bash
# Via l'API Render
curl -X PUT https://api.render.com/v1/services/srv-d7chdpa8qa3s73bjljs0/env-vars \
  -H "Authorization: Bearer <RENDER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '[{"key":"STRIPE_SECRET_KEY","value":"sk_live_..."}]'
```

---

## Supabase — table orders

Créer dans Supabase → SQL Editor :

```sql
CREATE TABLE orders (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  product_id        text        NOT NULL,
  amount            integer     NOT NULL,
  stripe_session_id text        UNIQUE NOT NULL,
  invoice_number    text        NOT NULL,
  email_sent        boolean     DEFAULT false,
  invoice_path      text,
  created_at        timestamptz DEFAULT now()
);
```

`UNIQUE` sur `stripe_session_id` = idempotence sur retry Stripe.
`email_sent` = empêche les doubles livraisons.
`invoice_path` = chemin Supabase Storage (`2026/2026-001.pdf`), nullable si archivage désactivé.

---

## Stripe — webhook

1. Dashboard Stripe → Développeurs → Webhooks → **Ajouter un endpoint**
   - URL : `https://creussite-backend.onrender.com/webhook`
   - Événement : `checkout.session.completed`
2. Copier le **Signing secret** → variable Render `STRIPE_WEBHOOK_SECRET`
3. Tester depuis Stripe CLI :

```bash
stripe listen --forward-to https://creussite-backend.onrender.com/webhook
stripe trigger checkout.session.completed
```

---

## DNS OVH — domaine c-reussite.fr

Configurer dans la zone DNS OVH :

```
Type    Sous-domaine    Valeur                    TTL
A       @               185.199.108.153           3600
A       @               185.199.109.153           3600
A       @               185.199.110.153           3600
A       @               185.199.111.153           3600
CNAME   www             creussite.github.io.      3600
```

Supprimer tout enregistrement A/AAAA existant sur `@` avant d'ajouter ceux-ci.

Puis dans GitHub → Settings → Pages :
- Custom domain : `c-reussite.fr`
- Enforce HTTPS : coché

GitHub génère le certificat Let's Encrypt automatiquement (~30 min après propagation DNS).

**Vérification :**
```bash
dig c-reussite.fr +short
# → 185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153
curl -sI https://c-reussite.fr | head -3
# → HTTP/2 200
```

---

## Déploiement

### Frontend (automatique)
Push sur `main` → GitHub Actions (`deploy.yml`) → GitHub Pages mis à jour.

### Backend (automatique)
Push sur `main` → GitHub Actions déclenche un redéploiement Render automatiquement.
Build : `cd backend && npm ci --omit=dev`
Start : `node server.js`

```bash
# Vérifier que le backend est en ligne
curl https://creussite-backend.onrender.com/api/health
# → {"status":"ok","service":"C'Réussite backend"}
```

---

## Tests

```bash
cd backend

# Tous les tests (pas de credential requis sauf les tests live Stripe)
npm test

# Test email complet (nécessite BREVO_API_KEY dans .env)
npm run test-email -- ton@email.fr maths
npm run test-email -- ton@email.fr physique
npm run test-email -- ton@email.fr bundle

# Tests live Stripe (avec STRIPE_SECRET_KEY)
STRIPE_SECRET_KEY=sk_live_... npm test
```

Les tests couvrent :
- Génération facture PDF (aucune credential)
- Validation products.json (aucune credential)
- Pipeline webhook complet avec mocks (aucune credential)
- Idempotence DB (aucune credential)
- Checkout live contre Render (STRIPE_SECRET_KEY requis pour le test de session)

---

## Dev local

```bash
# Frontend uniquement
python lance_site.py

# Backend
cd backend
cp .env.example .env   # remplir les valeurs
npm install
npm run dev
# → http://localhost:3000/api/health

# Tester webhook en local
stripe listen --forward-to localhost:3000/webhook
stripe trigger checkout.session.completed
```

---

## Coût mensuel

| Poste | Coût |
|-------|------|
| Domaine c-reussite.fr | ~0,60 €/mois (7 €/an) |
| GitHub Pages | Gratuit |
| Render | Gratuit (free tier permanent) |
| Supabase | Gratuit (free tier) |
| Brevo | Gratuit (300 emails/jour) |
| Stripe | 1,4% + 0,25 € par transaction |
| **Total fixe** | **~0,60 €/mois** |

---

## Comptes

| Service | URL |
|---------|-----|
| GitHub | https://github.com/CReussite/website |
| Render | https://dashboard.render.com/web/srv-d7chdpa8qa3s73bjljs0 |
| Backend | https://creussite-backend.onrender.com |
| Stripe | https://dashboard.stripe.com |
| Supabase | https://supabase.com |
| Brevo | https://brevo.com |
