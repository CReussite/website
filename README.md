# C'Réussite — Site de vente de fiches de révision

Site statique + backend Node.js pour la livraison automatique de PDF après paiement Stripe.

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend** | HTML / CSS / JS vanilla | Site statique, aucun framework |
| **Hébergement site** | GitHub Pages | CDN + déploiement auto via GitHub Actions |
| **Paiement** | Stripe Payment Links | Checkout hébergé, zéro backend pour le paiement |
| **Backend** | Node.js + Express | Webhook Stripe + sert le site statique |
| **Email transactionnel** | Brevo (sib-api-v3-sdk) | Envoi PDF en pièce jointe après achat |
| **Hébergement backend** | Railway | Serveur Node.js (site + API en un seul service) |
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
- [x] Config Railway (`railway.json`)

### 🔲 Reste à faire

#### Avant de pouvoir tester
- [ ] **Clé API Brevo** → variable d'env Railway → `BREVO_API_KEY=xkeysib-...`
  - https://brevo.com → Paramètres → Clés API → Générer
- [ ] Tester l'envoi : `cd backend && npm install && npm run test-email ton@email.fr physique`

#### Avant de lancer les ventes
- [ ] Configurer le service Railway avec les variables d'environnement
- [ ] Remplacer les PDFs de test par les vrais dans `backend/assets/`
- [ ] Enregistrer le webhook Stripe → remplir `STRIPE_WEBHOOK_SECRET` dans Railway
- [ ] Passer en mode Live Stripe (identité + RIB)
- [ ] Recréer les 3 produits/liens en mode Live, mettre à jour `payment.js`
- [ ] Retirer `<meta name="robots" content="noindex">` pour le référencement

---

## Garder le site privé avant le lancement

Le site est déployé sur GitHub Pages mais non indexé grâce à la balise `<meta name="robots" content="noindex">` sur toutes les pages. Seul celui qui a l'URL peut y accéder.

**Pour le rendre public au lancement :**
1. Retirer la balise `noindex` de `index.html`, `success.html`, `cancel.html`
2. Ajouter un `sitemap.xml`
3. Soumettre à Google Search Console

---

## Hébergement

### Site — GitHub Pages
```
Déploiement auto : push sur main → GitHub Actions → deploy.yml
Publish directory : docs/
URL : https://creussite.github.io/website/
```

### Backend + site — Railway (all-in-one)
```
Build command  : cd backend && npm install
Start command  : cd backend && npm start
Health check   : /api/health
Variables      : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY, FROM_NAME, FROM_EMAIL
URL            : https://xxx.up.railway.app
```

Le backend Express sert à la fois le site statique (`docs/`) et l'API webhook (`/webhook`).

### Dev local
```bash
# Option 1 : site statique seul (Python)
python lance_site.py

# Option 2 : backend complet (Node.js)
cd backend && npm install && npm run dev
```

---

## Enregistrer le webhook Stripe

1. Déployer le backend sur Railway → récupérer l'URL (`https://xxx.up.railway.app`)
2. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
   - URL : `https://xxx.up.railway.app/webhook`
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
| Railway | https://railway.app |
| Brevo | https://brevo.com |
| Email | contact@creussite.fr |
