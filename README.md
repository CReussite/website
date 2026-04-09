# C'Réussite — Site de vente de fiches de révision

Site statique + backend Node.js pour la livraison automatique de PDF après paiement Stripe.

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend** | HTML / CSS / JS vanilla | Site statique, aucun framework |
| **Hébergement site** | GitHub Pages | CDN gratuit + déploiement auto via GitHub Actions |
| **Paiement** | Stripe Payment Links | Checkout hébergé, zéro backend pour le paiement |
| **Backend (webhook)** | Node.js + Express | Réception webhook Stripe → envoi PDF par email |
| **Email transactionnel** | Brevo (sib-api-v3-sdk) | Envoi PDF en pièce jointe après achat |
| **Hébergement backend** | Railway (free tier) | Serveur Node.js pour le webhook uniquement |
| **SEO** | Schema.org JSON-LD | Rich snippets Google |
| **Contrôle de version** | Git + GitHub | Source of truth |

---

## Architecture

```
CReussite/
├── docs/                      ← Site statique (GitHub Pages + servi par Express)
│   ├── index.html             ← Page principale
│   ├── success.html           ← Confirmation après paiement
│   ├── cancel.html            ← Annulation du checkout
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── schema.js          ← JSON-LD (SEO)
│       ├── nav.js             ← Navigation (injection DOM)
│       ├── footer.js          ← Footer (injection DOM)
│       ├── contact.js         ← Formulaire de contact (injection DOM)
│       ├── main.js            ← Menu mobile, accordéon FAQ
│       └── payment.js         ← Liens Stripe par produit
│
├── backend/                   ← Serveur Node.js (Railway)
│   ├── server.js              ← Express : fichiers statiques + webhook
│   ├── routes/
│   │   └── webhook.js         ← checkout.session.completed → email
│   ├── services/
│   │   └── mailer.js          ← Brevo API — envoie PDF en PJ
│   ├── scripts/
│   │   └── test-email.js      ← Test d'envoi manuel
│   ├── assets/                ← PDFs à livrer (non commités)
│   │   ├── fiches-maths.pdf
│   │   └── fiches-physique-chimie.pdf
│   ├── .env                   ← Variables privées (non commité)
│   └── package.json
│
├── .github/workflows/
│   └── deploy.yml             ← Déploiement GitHub Pages auto
│
├── railway.json               ← Config déploiement Railway
├── lance_site.py              ← Serveur local Python (dev rapide)
├── .gitignore
└── README.md
```

---

## Produits Stripe (mode test)

| Produit | Prix | ID Stripe | Payment Link |
|---------|------|-----------|--------------|
| Fiches Maths Terminale | 14,99 € | `prod_UIc5mslp2TR9ym` | `plink_1TK0sDELyt8QW1SKUjaASkdz` |
| Fiches Physique-Chimie | 14,99 € | `prod_UIc5Mc666PbQnC` | `plink_1TK0sEELyt8QW1SKBTZnuLCC` |
| Pack Bundle | 24,99 € | `prod_UIc5HOO8ErMqzh` | `plink_1TK0sFELyt8QW1SKoUOkOfj5` |

---

## État du projet

### ✅ Fait
- [x] Site statique complet (design, responsive, SEO, JSON-LD)
- [x] Composants JS modulaires (nav, footer, contact, schema, payment)
- [x] Menu hamburger mobile
- [x] 3 produits Stripe en mode test avec Payment Links
- [x] Redirection vers `success.html` après paiement
- [x] Pages `success.html` et `cancel.html`
- [x] Backend Express : webhook Stripe + site statique servi
- [x] Mailer Brevo avec pièces jointes PDF en base64
- [x] Script de test email (`npm run test-email`)
- [x] PDFs de test dans `backend/assets/`
- [x] `.gitignore` configuré (`.env` et PDFs exclus)
- [x] Déploiement GitHub Pages fonctionnel (workflow Actions)
- [x] Déploiement Railway fonctionnel (build + healthcheck OK)
- [x] Variables d'environnement Railway configurées
- [x] Domaine Railway : `https://website-production-2f4e.up.railway.app`

### 🔲 Reste à configurer

#### 1. Clé API Brevo (envoi d'emails)
- [ ] https://app.brevo.com/settings/keys/api → Générer une clé
- [ ] Ajouter dans Railway → Variables → `BREVO_API_KEY=xkeysib-...`
- [ ] Tester : `cd backend && npm run test-email -- ton@email.fr physique`

#### 2. Webhook Stripe (livraison automatique)
- [ ] Dashboard Stripe → Développeurs → Webhooks → **Ajouter un endpoint**
  - URL : `https://website-production-2f4e.up.railway.app/webhook`
  - Événement : `checkout.session.completed`
- [ ] Copier le **Signing secret** (`whsec_...`) → variable Railway `STRIPE_WEBHOOK_SECRET`

#### 3. PDFs définitifs
- [ ] Remplacer les PDFs de test dans `backend/assets/` par les vrais fichiers

#### 4. Passer Stripe en mode Live
- [ ] Dashboard Stripe → Activer le mode Live (vérification identité + RIB)
- [ ] Recréer les 3 produits et Payment Links en mode Live
- [ ] Mettre à jour `docs/js/payment.js` avec les nouveaux liens Live
- [ ] Mettre à jour `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans Railway

#### 5. Rendre le site public (SEO)
- [ ] Retirer `<meta name="robots" content="noindex">` de `index.html`, `success.html`, `cancel.html`
- [ ] Ajouter un `sitemap.xml` dans `docs/`
- [ ] Soumettre à Google Search Console

---

## GitHub Pages vs Railway : pourquoi héberger le site sur GitHub

| | GitHub Pages | Railway |
|--|--|--|
| **Coût** | Gratuit, illimité | Free tier : 5 $/mois de crédit, puis payant |
| **CDN mondial** | Oui (Fastly) | Non |
| **Uptime** | 99.9%+ garanti par GitHub | Le service dort si pas de trafic (free tier) |
| **Domaine custom** | Gratuit + HTTPS auto | Payant (plan Hobby 5 $/mois) |
| **Temps de chargement** | < 100ms (fichiers statiques) | 200-500ms (serveur Node.js) |
| **Besoin d'un backend** | Non (site statique) | Oui (webhook Stripe) |

**Recommandation** : Héberger le site sur **GitHub Pages** (gratuit, rapide, fiable) et utiliser Railway **uniquement** pour le webhook Stripe. Le site n'a pas besoin d'un serveur — c'est du HTML/CSS/JS pur. Stripe Payment Links redirige vers le checkout Stripe directement. Seul le webhook post-achat nécessite un serveur.

---

## Domaine personnalisé (c-reussite.fr)

### Configuration DNS (OVH)

Ajouter ces enregistrements dans la zone DNS OVH de `c-reussite.fr` :

```
Type    Nom     Valeur                    TTL
A       @       185.199.108.153           3600
A       @       185.199.109.153           3600
A       @       185.199.110.153           3600
A       @       185.199.111.153           3600
CNAME   www     CReussite.github.io.      3600
```

> **Note** : Supprimer tout enregistrement A ou AAAA existant sur `@` avant d'ajouter ceux ci-dessus.

### Configuration GitHub Pages

1. Repo → Settings → Pages → Custom domain → `c-reussite.fr`
2. Cocher **Enforce HTTPS**
3. Le fichier `docs/CNAME` contient `c-reussite.fr` (déjà en place)
4. GitHub génère un certificat SSL gratuit (Let's Encrypt, ~30 min)

### Vérification

```bash
# Vérifier les enregistrements A
dig c-reussite.fr +short
# Doit retourner : 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153

# Vérifier le CNAME www
dig www.c-reussite.fr +short
# Doit retourner : CReussite.github.io.

# Vérifier HTTPS
curl -sI https://c-reussite.fr | head -5
# Doit retourner : HTTP/2 200

# Vérifier redirection www
curl -sI https://www.c-reussite.fr | head -5
# Doit retourner : HTTP/2 200 ou 301 → https://c-reussite.fr
```

### Dépannage

| Problème | Solution |
|----------|----------|
| "Domain not verified" | Attendre 24-48h pour la propagation DNS |
| Pas de HTTPS | Décocher puis recocher "Enforce HTTPS" dans Settings → Pages |
| 404 sur le domaine | Vérifier que `docs/CNAME` contient `c-reussite.fr` |
| www ne marche pas | Vérifier l'enregistrement CNAME `www → CReussite.github.io.` |

### Coût total

| Poste | Coût |
|-------|------|
| Domaine `c-reussite.fr` | ~7 €/an |
| GitHub Pages | Gratuit |
| HTTPS (Let's Encrypt) | Gratuit |
| Railway (webhook) | Gratuit (free tier 5 $/mois) |
| Stripe | 1.4% + 0.25 € par transaction |
| Brevo | Gratuit jusqu'à 300 emails/jour |
| **Total fixe** | **~7 €/an** |

---

## Privé / Public : comment contrôler la visibilité du site

### Site privé (état actuel)
Le site est en ligne mais **invisible pour Google** grâce à :
```html
<meta name="robots" content="noindex, nofollow">
```
- Google et les moteurs de recherche n'indexent pas les pages
- Le site est accessible uniquement par URL directe
- Parfait pour la phase de test et de préparation

### Rendre le site public
1. Retirer la balise `noindex` des 3 fichiers HTML :
   - `docs/index.html`
   - `docs/success.html`
   - `docs/cancel.html`
2. Créer `docs/sitemap.xml` pour aider Google à découvrir les pages
3. Soumettre le sitemap sur [Google Search Console](https://search.google.com/search-console/)
4. Commit + push → GitHub Pages se met à jour automatiquement

### Remettre le site en privé
Remettre la balise `<meta name="robots" content="noindex, nofollow">` dans le `<head>` de chaque page. Google supprimera les pages de ses résultats sous quelques jours.

---

## Hébergement

### Site — GitHub Pages (recommandé)
```
Déploiement auto : push sur main → GitHub Actions → deploy.yml
Publish directory : docs/
URL : https://creussite.github.io/website/
Domaine custom : creussite.fr (voir section dédiée)
```

### Backend (webhook) — Railway
```
Build command  : cd backend && npm install
Start command  : node backend/server.js
Health check   : /api/health
Variables      : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY, FROM_NAME, FROM_EMAIL
URL            : https://website-production-2f4e.up.railway.app
```

Le backend sert uniquement le webhook Stripe (`/webhook`) et le health check. Le site est hébergé sur GitHub Pages pour les performances et la fiabilité.

### Dev local
```bash
# Site statique seul (Python)
python lance_site.py

# Backend complet (Node.js)
cd backend && npm install && npm run dev
```

---

## Enregistrer le webhook Stripe

1. Récupérer l'URL Railway : `https://website-production-2f4e.up.railway.app`
2. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
   - URL : `https://website-production-2f4e.up.railway.app/webhook`
   - Événement : `checkout.session.completed`
3. Copier le **Signing secret** (`whsec_...`) → variable Railway `STRIPE_WEBHOOK_SECRET`
4. Railway recharge les variables automatiquement au redéploiement

**Test local :**
```bash
stripe listen --forward-to localhost:3000/webhook
# Terminal 2 :
cd backend && npm install && npm run dev
```

---

## Tester l'envoi d'email (Brevo)

```bash
cd backend
npm install
# Envoyer une fiche Physique-Chimie à ton adresse
npm run test-email -- ton@email.fr physique
# Envoyer le bundle
npm run test-email -- ton@email.fr bundle
# Envoyer Maths
npm run test-email -- ton@email.fr maths
```

---

## Ajouter un produit

1. Stripe → Produit → Prix → Payment Link
2. `docs/js/payment.js` → nouvelle entrée dans `PRODUCTS`
3. `backend/services/mailer.js` → `PRODUCT_PDF_MAP` et `PRODUCT_NAME_MAP`
4. `backend/assets/` → déposer le PDF
5. `docs/index.html` → nouvel `<article data-product="clé">`

---

## Comptes et accès

| Service | URL |
|---------|-----|
| Stripe (test) | https://dashboard.stripe.com/acct_1TK0ioELyt8QW1SK/test/dashboard |
| GitHub | https://github.com/CReussite/website |
| GitHub Pages | https://creussite.github.io/website/ |
| Railway | https://website-production-2f4e.up.railway.app |
| Brevo | https://brevo.com |
| Email | contact@creussite.fr |
