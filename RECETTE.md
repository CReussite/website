# Checklist de recette — C'Réussite

Mise à jour des prix + système codes promo + parrainage élèves.

---

## 1. Prix

- [ ] [c-reussite.fr/maths-terminale/](https://c-reussite.fr/maths-terminale/) affiche **19,90 €** partout (titre, boutons, upsell pack)
- [ ] [c-reussite.fr/physique-chimie-terminale/](https://c-reussite.fr/physique-chimie-terminale/) affiche **19,90 €** partout
- [ ] [c-reussite.fr/pack-maths-physique-chimie/](https://c-reussite.fr/pack-maths-physique-chimie/) affiche **29,90 €**, badge **−25 %**, barré **39,80 €**
- [ ] [c-reussite.fr/](https://c-reussite.fr/) — les 3 cartes hero affichent les bons prix
- [ ] [c-reussite.fr/cgv/](https://c-reussite.fr/cgv/) — prix mis à jour dans les CGV

---

## 2. Bandeau RENTREE10

- [ ] Le bandeau doré apparaît sur les 4 pages (accueil, maths, physique, pack)
- [ ] Il reste visible quand on scrolle vers le bas
- [ ] Sur mobile, le texte court s'affiche sur une seule ligne : **−10 % avec le code RENTREE10 (jusqu'au 30/09)**

---

## 3. Code promo dans la modale

- [ ] Cliquer "Commander" affiche un champ **"Code promo (facultatif)"** dans la modale
- [ ] Taper `RENTREE10` + cliquer **Appliquer** → prix barré + nouveau prix en vert (−10 %)
- [ ] Taper un code faux → message d'erreur en rouge dans la modale
- [ ] Le prix affiché dans la modale correspond bien à ce qui sera facturé

---

## 4. RENTREE10 — paiement réel

- [ ] Commander avec `RENTREE10` → montant débité **17,91 €** (ebook) ou **26,91 €** (pack)
- [ ] La facture reçue par email affiche le bon montant remisé
- [ ] Commander sans code → montant normal (19,90 € ou 29,90 €)

---

## 5. EXTRAIT15 — flux complet

- [ ] Demander un extrait sur [c-reussite.fr/extrait-gratuit/](https://c-reussite.fr/extrait-gratuit/)
- [ ] L'email reçu contient le bouton **"Utiliser mon −15 % maintenant →"**
- [ ] Cliquer le lien → la page produit s'ouvre, le champ code promo est **pré-rempli**
- [ ] Cliquer Appliquer → **−15 %** appliqué (17,92 € ebook / 25,42 € pack)
- [ ] Utiliser le même lien une 2e fois → message **"Ce code a déjà été utilisé"**
- [ ] Attendre 24h et réessayer → message **"Ce code a expiré"**

---

## 6. Migration Supabase

Sur [supabase.com/dashboard/project/llomqecxvbefakyysskn](https://supabase.com/dashboard/project/llomqecxvbefakyysskn) → Table Editor :

- [ ] Table **`promo_codes`** existe et contient la ligne `RENTREE10`
- [ ] Table **`extrait_tokens`** existe (vide au départ, se remplit après une demande d'extrait)
- [ ] Table **`pending_payments`** existe
- [ ] Table **`orders`** a les colonnes `promo_code`, `discount_percent`, `original_amount`

---

## 7. Admin — codes promo

Sur [c-reussite.fr/admin.html](https://c-reussite.fr/admin.html) → section **Codes promo** :

- [ ] `RENTREE10` apparaît dans la liste (Type : Public, Remise : −10 %, Expiration : 30/09/2026)
- [ ] Créer un code élève (ex. prénom **Lucie**, email test) → code **LUCIE20** créé
- [ ] Le bouton **Désactiver** fonctionne → statut passe à Inactif
- [ ] Taper `LUCIE20` dans la modale → **−20 %** appliqué

---

## 8. Non-cumulabilité

- [ ] Valider `RENTREE10`, puis retaper `LUCIE20` + Appliquer → seul le dernier code est actif (le précédent est remplacé, pas cumulé)

---

## 9. Backend health check

```
curl https://creussite-backend.onrender.com/api/healthz
```

- [ ] Réponse `"status":"ok"` avec `env:ok` et `db:ok`
