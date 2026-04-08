# C'Réussite — Site de vente de fiches de révision

Site statique + backend Node.js pour la livraison automatique de PDF après paiement Stripe.

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend** | HTML / CSS / JS vanilla | Site statique, aucun framework |
| **Hébergement site** | Netlify | CDN + déploiement GitHub auto |
| **Paiement** | Stripe Payment Links | Checkout hébergé, zéro backend pour le paiement |
| **Backend** | Node.js + Express | Serveur webhook |
| **Email transactionnel** | Brevo (sib-api-v3-sdk) | Envoi PDF en pièce jointe après achat |
| **Hébergement backend** | Railway | Serveur Node.js persistant |
| **SEO** | Schema.org JSON-LD | Rich snippets Google |
| **Contrôle de version** | Git + GitHub | Source of truth |

---

## Architecture

```
CReussite/
├── docs/                      ← Site statique (Netlify)
│   ├── index.html             ← Page principale
│   ├── success.html           ← Confirmation après paiement
│   ├── cancel.html            ← Annulation du checkout
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── schema.js          ← JSON-LD (SEO)
│       ├── nav.js             ← Navigation
│       ├── footer.js          ← Footer
│       ├── contact.js         ← Formulaire de contact
│       └── payment.js         ← Liens Stripe par produit
│
├── backend/                   ← Serveur Node.js (Railway)
│   ├── server.js              ← Express + routes
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
│   ├── .env.example
│   └── package.json
│
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
- [x] 3 produits Stripe en mode test avec Payment Links
- [x] Redirection vers `success.html` après paiement
- [x] Pages `success.html` et `cancel.html`
- [x] Backend Express webhook prêt
- [x] Mailer Brevo avec pièces jointes PDF en base64
- [x] Script de test email (`npm run test-email`)
- [x] PDFs de test dans `backend/assets/`
- [x] `.gitignore` configuré (`.env` et PDFs exclus)

### 🔲 Reste à faire

#### Avant de pouvoir tester
- [ ] **Clé API Brevo** → `backend/.env` → `BREVO_API_KEY=xkeysib-...`
  - https://brevo.com → Paramètres → Clés API → Générer
- [ ] Tester l'envoi : `cd backend && npm install && npm run test-email ton@email.fr physique`

#### Avant de lancer les ventes
- [ ] Remplacer les PDFs de test par les vrais dans `backend/assets/`
- [ ] Enregistrer le webhook Stripe → remplir `STRIPE_WEBHOOK_SECRET` dans `.env`
- [ ] Passer en mode Live Stripe (identité + RIB)
- [ ] Recréer les 3 produits/liens en mode Live, mettre à jour `payment.js`

---

## Garder le site privé avant le lancement

Le site est déployé sur Netlify mais non indexé grâce à la balise `<meta name="robots" content="noindex">` sur toutes les pages. Seul celui qui a l'URL peut y accéder.

**Pour le rendre public au lancement :**
1. Retirer la balise `noindex` de `index.html`, `success.html`, `cancel.html`
2. Ajouter un `sitemap.xml`
3. Soumettre à Google Search Console

---

## Hébergement

### Site — Netlify
```
Déploiement auto : push sur main → Netlify rebuild
Publish directory : docs/
URL : https://xxx.netlify.app (ou domaine custom)
```

### Backend — Railway
```
Root directory : backend/
Start command  : npm start
Variables      : copier le contenu de backend/.env
URL            : https://xxx.railway.app
```

---

## Enregistrer le webhook Stripe

1. Déployer le backend sur Railway → récupérer l'URL (`https://xxx.railway.app`)
2. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
   - URL : `https://xxx.railway.app/webhook`
   - Événement : `checkout.session.completed`
3. Copier le **Signing secret** (`whsec_...`) → `backend/.env` → `STRIPE_WEBHOOK_SECRET`
4. Redéployer Railway (les variables sont rechargées automatiquement)

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
| Netlify | https://app.netlify.com |
| Railway | https://railway.app |
| Brevo | https://brevo.com |
| Email | contact@creussite.fr |
