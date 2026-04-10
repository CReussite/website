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
Backend Express (Railway — website-production-2f4e.up.railway.app)
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
| Backend | Node.js + Express (Railway) |
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
│   │   └── webhook.js             ← POST /webhook → DB + invoice + email
│   ├── services/
│   │   ├── db.js                  ← Supabase (insert idempotent)
│   │   ├── invoice.js             ← Génération PDF facture
│   │   └── mailer.js              ← Brevo (PDF produit + facture)
│   ├── assets/                    ← PDFs à livrer (non commités)
│   ├── tests/                     ← Tests node:test
│   └── .env.example
│
├── .github/workflows/deploy.yml   ← GitHub Pages auto-deploy
└── railway.json                   ← Config Railway
```

---

## Produits (source unique)

Tout produit est défini **une seule fois** dans `docs/content/products.json`.
Le backend et le frontend lisent tous les deux ce fichier.

```json
[
  { "id": "maths",    "name": "Fiches Maths Terminale Spécialité",     "price": 1499, "pdf_files": ["fiches-maths.pdf"] },
  { "id": "physique", "name": "Fiches Physique-Chimie Terminale Spécialité", "price": 1499, "pdf_files": ["fiches-physique-chimie.pdf"] },
  { "id": "bundle",   "name": "Pack Maths + Physique-Chimie",          "price": 2499, "pdf_files": ["fiches-maths.pdf", "fiches-physique-chimie.pdf"] }
]
```

**Ajouter un produit** : modifier `products.json` + déposer le PDF dans `backend/assets/` + ajouter l'article dans `docs/index.html`. C'est tout.

---

## Variables d'environnement (Railway)

Copier `backend/.env.example`, remplir chaque valeur, puis les ajouter dans Railway → Variables.

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe → Développeurs → Clés API |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Développeurs → Webhooks → Signing secret |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `BREVO_API_KEY` | brevo.com → Paramètres → Clés API |
| `FROM_EMAIL` | `contact@c-reussite.fr` |
| `FROM_NAME` | `Camille Reinhardt, C'Réussite` |
| `ALERT_EMAIL` | Adresse qui reÃ§oit les alertes backend |
| `ALERT_FROM_NAME` | Nom affichÃ© pour les alertes techniques |
| `FRONTEND_URL` | `https://c-reussite.fr` |

```bash
# Depuis le repo (Railway CLI)
railway variables set STRIPE_SECRET_KEY=sk_live_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set SUPABASE_URL=https://xxxx.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJ...
railway variables set BREVO_API_KEY=xkeysib-...
railway variables set FROM_EMAIL=contact@c-reussite.fr
railway variables set "FROM_NAME=Camille Reinhardt, C'Réussite"
railway variables set ALERT_EMAIL=contact@c-reussite.fr
railway variables set "ALERT_FROM_NAME=C'RÃ©ussite Monitoring"
railway variables set FRONTEND_URL=https://c-reussite.fr
```

---

## Supabase — table orders

Créer dans Supabase → SQL Editor :

```sql
CREATE TABLE orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  product_id        text NOT NULL,
  amount            integer NOT NULL,
  stripe_session_id text UNIQUE NOT NULL,
  invoice_number    text NOT NULL,
  created_at        timestamptz DEFAULT now()
);
```

La contrainte `UNIQUE` sur `stripe_session_id` garantit l'idempotence : un retry Stripe ne crée pas de doublon.

---

## Stripe — webhook

1. Dashboard Stripe → Développeurs → Webhooks → **Ajouter un endpoint**
   - URL : `https://website-production-2f4e.up.railway.app/webhook`
   - Événement : `checkout.session.completed`
2. Copier le **Signing secret** → variable Railway `STRIPE_WEBHOOK_SECRET`
3. Tester depuis Stripe CLI :

```bash
stripe listen --forward-to https://website-production-2f4e.up.railway.app/webhook
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
Push sur `main` → Railway redéploie si le repo est connecté.
Build : `cd backend && npm install`
Start : `node backend/server.js`

```bash
# Vérifier que le backend est en ligne
curl https://website-production-2f4e.up.railway.app/api/health
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
- Checkout live contre Railway (STRIPE_SECRET_KEY requis pour le test de session)

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
| Railway | Gratuit (5 $/mois de crédit free tier) |
| Supabase | Gratuit (free tier) |
| Brevo | Gratuit (300 emails/jour) |
| Stripe | 1,4% + 0,25 € par transaction |
| **Total fixe** | **~0,60 €/mois** |

---

## Comptes

| Service | URL |
|---------|-----|
| GitHub | https://github.com/CReussite/website |
| Railway | https://railway.app → projet `amiable-reflection` |
| Backend | https://website-production-2f4e.up.railway.app |
| Stripe | https://dashboard.stripe.com |
| Supabase | https://supabase.com |
| Brevo | https://brevo.com |
