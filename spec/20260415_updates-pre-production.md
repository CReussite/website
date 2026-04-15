# Mises à jour pré-production — 15 avril 2026


---

## Sommaire

- [Mises à jour pré-production — 15 avril 2026](#mises-à-jour-pré-production--15-avril-2026)
  - [Sommaire](#sommaire)
  - [1. Supprimer la stéganographie sur les extraits gratuits](#1-supprimer-la-stéganographie-sur-les-extraits-gratuits)
  - [2. Stéganographie : ne garder que l'email (supprimer le nom)](#2-stéganographie--ne-garder-que-lemail-supprimer-le-nom)
  - [3. Supprimer les emails d'extrait après envoi (RGPD)](#3-supprimer-les-emails-dextrait-après-envoi-rgpd)
  - [4. Mettre à jour la politique de confidentialité (données bancaires → Stancer)](#4-mettre-à-jour-la-politique-de-confidentialité-données-bancaires--stancer)
  - [5. Masquer la section avis tant qu'il n'y a pas de vrais avis](#5-masquer-la-section-avis-tant-quil-ny-a-pas-de-vrais-avis)
  - [6. Remplacer Stripe par Stancer](#6-remplacer-stripe-par-stancer)
    - [6.1 Fichiers backend à modifier](#61-fichiers-backend-à-modifier)
    - [6.2 Fichiers frontend à modifier](#62-fichiers-frontend-à-modifier)
    - [6.3 Pages légales à mettre à jour](#63-pages-légales-à-mettre-à-jour)
    - [6.4 Variables d'environnement (Render)](#64-variables-denvironnement-render)
    - [6.5 Base de données — migration](#65-base-de-données--migration)
    - [6.6 Dépendances npm](#66-dépendances-npm)
    - [6.7 Tests](#67-tests)
    - [6.8 Documentation Stancer](#68-documentation-stancer)
  - [7. Réinitialiser les numéros de facture à zéro](#7-réinitialiser-les-numéros-de-facture-à-zéro)
  - [Ordre d'exécution recommandé](#ordre-dexécution-recommandé)

---

## 1. Supprimer la stéganographie sur les extraits gratuits

**Contexte :** Les extraits gratuits envoyés via le formulaire sont actuellement marqués par stéganographie (texte invisible + métadonnées). Ce n'est pas nécessaire puisque les extraits sont gratuits et publics.

**Fichier concerné :** `backend/routes/extract.js`

**Modifications :**

- Supprimer la fonction `stampExtractPdf()` (lignes ~19-49) qui applique le watermark invisible et les métadonnées sur les extraits.
- Dans la boucle de construction des `attachments` (ligne ~71), envoyer le buffer brut sans passer par `stampExtractPdf()`. Remplacer :
  ```js
  const stamped = await stampExtractPdf(rawBuffer, email);
  attachments.push({ name: filename, content: stamped.toString('base64') });
  ```
  par :
  ```js
  attachments.push({ name: filename, content: rawBuffer.toString('base64') });
  ```
- Supprimer l'import de `{ PDFDocument, rgb }` de `pdf-lib` s'il n'est plus utilisé ailleurs dans ce fichier.

**Tests :** Envoyer un extrait via le formulaire, ouvrir le PDF dans Acrobat, faire Ctrl+A → le texte invisible ne doit plus apparaître. Vérifier les métadonnées Author/Keywords/Subject : elles ne doivent plus contenir l'email du destinataire.

---

## 2. Stéganographie : ne garder que l'email (supprimer le nom)

**Contexte :** La stéganographie sur les PDFs payants inscrit actuellement `${customerName} <${customerEmail}>` dans le texte invisible et dans les métadonnées. On ne veut garder que l'email.

**Fichier concerné :** `backend/services/mailer.js` — fonction `stampPdf()`

**Modifications :**

- Modifier la signature de `stampPdf` : supprimer le paramètre `customerName` (ou l'ignorer).
- **Métadonnées** : remplacer les références au nom :
  ```js
  pdfDoc.setAuthor(`Acheté par : ${customerEmail}`);
  pdfDoc.setKeywords([`acheteur:${customerEmail}`, "C'Réussite"]);
  pdfDoc.setSubject(`Document personnel — ${customerEmail}`);
  ```
- **Texte invisible** : remplacer le stamp :
  ```js
  const stamp = customerEmail;
  ```
  au lieu de `const stamp = \`${customerName} <${customerEmail}>\``.
- Mettre à jour l'appel à `stampPdf()` dans `sendOrderEmail()` (même fichier, ligne ~75) :
  ```js
  const stamped = await stampPdf(rawBuffer, toEmail);
  ```

**Impact sur la documentation :** Mettre à jour `SPEC-METIER.md` section 6 (« Protection contre le partage illégal ») pour indiquer que seul l'email est inscrit, pas le nom.

**Tests :** Commander un produit en test, ouvrir le PDF dans Acrobat, Ctrl+A → seul l'email doit apparaître (5 fois par page). Vérifier les métadonnées : pas de nom.

---

## 3. Supprimer les emails d'extrait après envoi (RGPD)

**Contexte :** Les adresses email collectées via le formulaire d'extrait gratuit sont actuellement conservées dans la table `extract_requests` en base Supabase. La politique de confidentialité (`docs/confidentialite.html`) indique déjà que ces adresses sont « supprimées après l'envoi de l'extrait ». Il faut aligner le code sur cette promesse.

**Fichier concerné :** `backend/routes/extract.js`

**Modifications :**

- Après l'envoi réussi de l'email (après `await apiInstance.sendTransacEmail(sendSmtpEmail)`), ne plus appeler `insertExtractRequest()`, **ou** appeler `insertExtractRequest()` en remplaçant l'email par une valeur anonymisée (ex : `"anonyme"`) pour conserver les statistiques de volume sans stocker de données personnelles.
- Option recommandée — garder les stats anonymisées :
  ```js
  await insertExtractRequest({ email: 'anonyme', productId: product_id });
  ```
  Cela permet de conserver le compteur d'extraits envoyés dans le dashboard admin sans stocker de données personnelles.

**Impact sur le dashboard admin :** Les statistiques `extract_requests` et `extract_emails` dans `backend/services/db.js` → `getAdminStats()` n'afficheront plus d'emails uniques. Le compteur de demandes reste fonctionnel.

**Impact sur la base de données :** Les anciennes entrées de `extract_requests` contenant de vrais emails doivent être anonymisées. Créer une migration Supabase :
```sql
-- supabase/migrations/20260415000000_anonymize_extract_emails.sql
UPDATE extract_requests SET email = 'anonyme' WHERE email != 'anonyme';
```

**Tests :** Envoyer un extrait, puis vérifier dans Supabase que la table `extract_requests` ne contient pas le vrai email.

---

## 4. Mettre à jour la politique de confidentialité (données bancaires → Stancer)

**Contexte :** La politique de confidentialité (`docs/confidentialite.html`) mentionne déjà Stancer pour les données bancaires (ligne 112). Vérifier que **toutes** les mentions de Stripe dans les pages légales et le code ont bien été remplacées par Stancer (voir tâche 6).

**Fichier concerné :** `docs/confidentialite.html`

**Vérification :** La ligne existante est correcte :
> « Données de paiement (numéro de carte, etc.) : traitées et conservées par Stancer selon sa propre politique de confidentialité. Le vendeur ne stocke pas de données bancaires. »

**Action :** S'assurer que cette mention reste cohérente après le remplacement de Stripe par Stancer (tâche 6). Si des mentions de Stripe subsistent dans `confidentialite.html`, les remplacer par Stancer.

---

## 5. Masquer la section avis tant qu'il n'y a pas de vrais avis

**Contexte :** La page d'accueil (`docs/index.html`) affiche actuellement une section « Ce qu'en disent les élèves » avec 3 témoignages fictifs, une note « 5,0 / 5 » et « (12 avis) ». Il ne faut pas afficher de faux avis.

**Fichiers concernés :**
- `docs/index.html`
- `docs/js/nav.js`
- `docs/js/review.js`
- `docs/css/style.css`

**Modifications :**

1. **`docs/index.html`** : Masquer la section témoignages (lignes ~237-273). Ajouter `hidden` sur la section :
   ```html
   <section id="avis" aria-labelledby="temoignages-title" hidden>
   ```
   Ou supprimer le contenu des cartes témoignages et le résumé (`reviews-summary`). La section pourra être réactivée quand de vrais avis seront collectés.

2. **`docs/js/nav.js`** : Supprimer ou commenter le lien « Avis » dans la navigation (ligne ~13) :
   ```js
   <li><a href="${base}#avis">Avis</a></li>
   ```

3. **Popup d'avis** (`docs/index.html`, lignes ~377+) : Masquer également le popup d'avis (ajouter `hidden`) ou le supprimer temporairement. Le bouton « Donner son avis → » ne sera plus visible puisque la section est cachée.

4. **`docs/js/review.js`** : Garder le fichier en l'état (il ne fera rien si les éléments sont `hidden`). Pas besoin de le supprimer pour pouvoir le réactiver facilement.

**Note :** Ne pas supprimer le code, simplement le masquer. Quand de vrais avis seront collectés, il suffira de retirer le `hidden` et mettre à jour le contenu des cartes témoignages.

---

## 6. Remplacer Stripe par Stancer

**Contexte :** Le système de paiement doit migrer de Stripe (Stripe Checkout + webhooks) vers Stancer. C'est la modification la plus structurante.

### 6.1 Fichiers backend à modifier

| Fichier | Rôle actuel (Stripe) | Action |
|---|---|---|
| `backend/routes/checkout.js` | Crée une session Stripe Checkout | Réécrire pour créer un paiement Stancer |
| `backend/routes/webhook.js` | Reçoit et vérifie les webhooks Stripe (`stripe.webhooks.constructEvent`) | Réécrire pour recevoir et vérifier les webhooks Stancer |
| `backend/routes/admin.js` | Affiche le mode Stripe (test/live) via `STRIPE_SECRET_KEY` | Adapter la détection de mode pour Stancer |
| `backend/server.js` | Monte les routes — pas de dépendance Stripe directe | Vérifier, ajuster si besoin |
| `backend/services/db.js` | Référence `stripe_session_id` partout | Renommer en `payment_session_id` ou `stancer_payment_id` (+ migration SQL) |

### 6.2 Fichiers frontend à modifier

| Fichier | Rôle actuel | Action |
|---|---|---|
| `docs/js/payment.js` | POST vers `/api/checkout`, redirige vers `session.url` Stripe | Adapter au flux Stancer (page de paiement Stancer ou intégration JS Stancer) |
| `docs/index.html` | Boutons « Commander » | Vérifier que le flux fonctionne |
| `docs/success.html` | Lit `session_id` en query string (Stripe) | Adapter au paramètre Stancer |
| `docs/cancel.html` | Page d'annulation | Vérifier la compatibilité |

### 6.3 Pages légales à mettre à jour

Remplacer **toutes** les mentions de « Stripe » par « Stancer » dans :
- `docs/confidentialite.html`
- `docs/cgv.html`
- `docs/mentions-legales.html`
- `docs/cgu.html`
- `SPEC-METIER.md` (sections 4, 9, 12, 13)

### 6.4 Variables d'environnement (Render)

| Variable actuelle | Nouvelle variable |
|---|---|
| `STRIPE_SECRET_KEY` | `STANCER_SECRET_KEY` (ou équivalent selon la doc Stancer) |
| `STRIPE_WEBHOOK_SECRET` | `STANCER_WEBHOOK_SECRET` (si applicable) |

### 6.5 Base de données — migration

Créer une migration pour renommer la colonne :
```sql
-- supabase/migrations/20260415000001_rename_stripe_to_stancer.sql
ALTER TABLE orders RENAME COLUMN stripe_session_id TO payment_session_id;
```

Mettre à jour toutes les requêtes dans `backend/services/db.js` en conséquence.

### 6.6 Dépendances npm

- Supprimer le package `stripe` : `npm uninstall stripe`
- Installer le SDK Stancer si disponible, ou utiliser `fetch` / `axios` pour appeler l'API Stancer directement.

### 6.7 Tests

- Mettre à jour tous les fichiers de test (`backend/tests/checkout.test.js`, `webhook.test.js`, etc.) pour refléter l'intégration Stancer.
- Tester un paiement de bout en bout en mode test Stancer.

### 6.8 Documentation Stancer

- API : https://www.stancer.com/documentation/
- Consulter en particulier : création de paiement, page de paiement hébergée, webhooks, mode test vs production.

---

## 7. Réinitialiser les numéros de facture à zéro

**Contexte :** Les numéros de facture actuels (`CRE-2026-00001`, `CRE-2026-00002`, etc.) incluent les commandes de test. Avant la mise en production, il faut repartir de `CRE-2026-00001`.

**Fichier concerné :** `backend/services/db.js` — fonction `insertOrderIdempotent()`

**Modifications :**

1. **Purger les commandes de test dans Supabase.** Créer une migration :
   ```sql
   -- supabase/migrations/20260415000002_purge_test_orders.sql
   -- ⚠️ À exécuter UNIQUEMENT avant la mise en production.
   -- Supprime toutes les commandes de test.
   DELETE FROM orders;
   ```
   Cela remet le compteur séquentiel à zéro puisque `insertOrderIdempotent()` compte les lignes existantes avec `like('invoice_number', 'CRE-${year}-%')`.

2. **Purger les factures archivées.** Vider le bucket `invoices` dans Supabase Storage (les factures de test n'ont pas de valeur comptable).

3. **Alternative sans purge :** Si on veut conserver l'historique de test, modifier `insertOrderIdempotent()` pour filtrer uniquement les commandes de production. Par exemple, ajouter un champ `is_test` dans la table `orders` et ne compter que les `is_test = false`. Mais la purge est plus simple et recommandée avant la mise en production.

**⚠️ Attention :** Cette migration est irréversible. Ne l'exécuter qu'une seule fois, juste avant le passage en production, et après confirmation explicite de la propriétaire.

**Tests :** Après la purge, passer une commande de test → le numéro de facture doit être `CRE-2026-00001`.

---

## Ordre d'exécution recommandé

| Étape | Tâche | Dépendances |
|---|---|---|
| 1 | Masquer les avis (tâche 5) | Aucune |
| 2 | Supprimer la stégano des extraits (tâche 1) | Aucune |
| 3 | Stégano email uniquement (tâche 2) | Aucune |
| 4 | Anonymiser les emails d'extrait (tâche 3) | Aucune |
| 5 | Remplacer Stripe par Stancer (tâche 6) | La plus longue — faire en priorité |
| 6 | Mettre à jour la politique de confidentialité (tâche 4) | Après tâche 6 |
| 7 | Réinitialiser les factures (tâche 7) | **En dernier**, juste avant la mise en production |

---

*Rédigé le 15 avril 2026*
