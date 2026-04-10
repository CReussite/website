#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# setup-render.sh — Migration automatisée Railway → Render
#
# Prérequis :
#   1. Créer un compte Render : https://dashboard.render.com/register
#   2. Connecter GitHub dans Render (Settings → Git)
#   3. Générer une API key : https://dashboard.render.com/u/settings
#
# Usage :
#   ./setup-render.sh <RENDER_API_KEY>
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}ℹ ${NC}$*"; }
ok()    { echo -e "${GREEN}✓ ${NC}$*"; }
warn()  { echo -e "${YELLOW}⚠ ${NC}$*"; }
fail()  { echo -e "${RED}✗ ${NC}$*"; exit 1; }

API_KEY="${1:-}"
if [[ -z "$API_KEY" ]]; then
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo -e "${CYAN}   Migration C'Réussite → Render (free tier)${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo ""
  echo "Usage : ./setup-render.sh <RENDER_API_KEY>"
  echo ""
  echo "Pour obtenir ta clé API :"
  echo "  1. Va sur https://dashboard.render.com/register"
  echo "     → Inscris-toi avec GitHub"
  echo "  2. Va sur https://dashboard.render.com/u/settings"
  echo "     → Clique 'Add API Key'"
  echo "     → Copie la clé"
  echo "  3. Relance : ./setup-render.sh rnd_xxxxx"
  echo ""
  exit 1
fi

API_BASE="https://api.render.com/v1"
AUTH="Authorization: Bearer ${API_KEY}"

# ── Vérifier l'authentification ────────────────────────
info "Vérification de la clé API..."
USER_RESP=$(curl -sS -w "\n%{http_code}" "$API_BASE/owners?limit=1" \
  -H "$AUTH" -H "Accept: application/json" 2>&1)
HTTP_CODE=$(echo "$USER_RESP" | tail -1)
USER_BODY=$(echo "$USER_RESP" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
  fail "Clé API invalide (HTTP $HTTP_CODE). Vérifie ta clé sur https://dashboard.render.com/u/settings"
fi
ok "Authentification OK."

# Extraire l'owner ID (workspace)
OWNER_ID=$(echo "$USER_BODY" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['owner']['id'])" 2>/dev/null || \
           echo "$USER_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)

if [[ -z "$OWNER_ID" ]]; then
  fail "Impossible d'extraire l'owner ID. Réponse : $USER_BODY"
fi
ok "Workspace ID : $OWNER_ID"

# ── Récupérer les variables depuis Railway ─────────────
info "Récupération des variables Railway..."
RAILWAY_VARS=""
if command -v railway &>/dev/null; then
  # Récupérer chaque variable individuellement
  get_railway_var() {
    railway variables 2>/dev/null | grep -E "^\║ *$1 " | sed 's/.*│ *//;s/ *║$//' | tr -d '\n' | xargs 2>/dev/null || echo ""
  }

  # On parse la sortie formatée de railway variables
  STRIPE_SECRET_KEY=$(railway variables 2>/dev/null | awk -F'│' '/STRIPE_SECRET_KEY/{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  STRIPE_WEBHOOK_SECRET=$(railway variables 2>/dev/null | awk -F'│' '/STRIPE_WEBHOOK_SECRET/{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  SUPABASE_URL=$(railway variables 2>/dev/null | awk -F'│' '/SUPABASE_URL /{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  SUPABASE_SERVICE_ROLE_KEY=$(railway variables 2>/dev/null | awk -F'│' '/SUPABASE_SERVICE_ROLE_KEY/{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  BREVO_API_KEY=$(railway variables 2>/dev/null | awk -F'│' '/BREVO_API_KEY/{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  FROM_EMAIL=$(railway variables 2>/dev/null | awk -F'│' '/FROM_EMAIL /{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  FROM_NAME=$(railway variables 2>/dev/null | awk -F'│' '/FROM_NAME /{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  ADMIN_KEY=$(railway variables 2>/dev/null | awk -F'│' '/ADMIN_KEY /{gsub(/^[ ]+|[ ]+$/,"",$2); printf "%s",$2}' | tr -d ' ║')
  ok "Variables Railway récupérées."
else
  warn "Railway CLI non trouvé. Lecture depuis backend/.env..."
  if [[ -f "backend/.env" ]]; then
    source backend/.env 2>/dev/null
    ok "Variables chargées depuis backend/.env"
  else
    fail "Ni Railway CLI ni backend/.env trouvé. Impossible de récupérer les variables."
  fi
fi

# ── Vérifier qu'on a les variables essentielles ───────
MISSING=""
for var in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY BREVO_API_KEY FROM_EMAIL FROM_NAME ADMIN_KEY; do
  val="${!var:-}"
  if [[ -z "$val" ]]; then
    MISSING="$MISSING $var"
  fi
done

if [[ -n "$MISSING" ]]; then
  warn "Variables manquantes :$MISSING"
  warn "Le script va continuer mais tu devras les ajouter manuellement dans Render."
fi

# ── Créer le service web ──────────────────────────────
info "Création du service web sur Render..."

SERVICE_PAYLOAD=$(cat <<ENDJSON
{
  "type": "web_service",
  "name": "creussite-backend",
  "ownerId": "$OWNER_ID",
  "repo": "https://github.com/CReussite/website",
  "branch": "main",
  "rootDir": "backend",
  "autoDeploy": "yes",
  "serviceDetails": {
    "runtime": "node",
    "plan": "free",
    "region": "frankfurt",
    "buildCommand": "npm ci --omit=dev",
    "startCommand": "node server.js",
    "healthCheckPath": "/api/healthz",
    "envSpecificDetails": {
      "buildCommand": "npm ci --omit=dev",
      "startCommand": "node server.js"
    }
  },
  "envVars": [
    {"key": "NODE_ENV", "value": "production"},
    {"key": "STRIPE_SECRET_KEY", "value": "${STRIPE_SECRET_KEY:-REPLACE_ME}"},
    {"key": "STRIPE_WEBHOOK_SECRET", "value": "${STRIPE_WEBHOOK_SECRET:-REPLACE_ME}"},
    {"key": "SUPABASE_URL", "value": "${SUPABASE_URL:-REPLACE_ME}"},
    {"key": "SUPABASE_SERVICE_ROLE_KEY", "value": "${SUPABASE_SERVICE_ROLE_KEY:-REPLACE_ME}"},
    {"key": "BREVO_API_KEY", "value": "${BREVO_API_KEY:-REPLACE_ME}"},
    {"key": "FROM_EMAIL", "value": "${FROM_EMAIL:-contact@c-reussite.fr}"},
    {"key": "FROM_NAME", "value": "${FROM_NAME:-C'Réussite}"},
    {"key": "ADMIN_KEY", "value": "${ADMIN_KEY:-REPLACE_ME}"}
  ]
}
ENDJSON
)

CREATE_RESP=$(curl -sS -w "\n%{http_code}" -X POST "$API_BASE/services" \
  -H "$AUTH" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "$SERVICE_PAYLOAD" 2>&1)
CREATE_CODE=$(echo "$CREATE_RESP" | tail -1)
CREATE_BODY=$(echo "$CREATE_RESP" | sed '$d')

if [[ "$CREATE_CODE" == "201" ]]; then
  SERVICE_ID=$(echo "$CREATE_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['service']['id'])" 2>/dev/null || echo "")
  SERVICE_URL=$(echo "$CREATE_BODY" | python3 -c "import sys,json; s=json.load(sys.stdin)['service']; print(s.get('serviceDetails',{}).get('url',''))" 2>/dev/null || echo "")
  ok "Service créé ! ID : $SERVICE_ID"
elif [[ "$CREATE_CODE" == "402" ]]; then
  fail "Render demande un moyen de paiement. Va sur https://dashboard.render.com/billing et ajoute une carte (tu ne seras pas débité pour le free tier)."
elif [[ "$CREATE_CODE" == "409" ]]; then
  warn "Un service 'creussite-backend' existe déjà. Récupération..."
  LIST_RESP=$(curl -sS "$API_BASE/services?limit=50&type=web_service" \
    -H "$AUTH" -H "Accept: application/json" 2>&1)
  SERVICE_ID=$(echo "$LIST_RESP" | python3 -c "
import sys,json
for s in json.load(sys.stdin):
  if s['service']['name'] == 'creussite-backend':
    print(s['service']['id']); break
" 2>/dev/null || echo "")
  if [[ -n "$SERVICE_ID" ]]; then
    ok "Service existant trouvé : $SERVICE_ID"
  else
    fail "Service introuvable. Réponse : $CREATE_BODY"
  fi
else
  fail "Erreur création service (HTTP $CREATE_CODE) : $CREATE_BODY"
fi

# ── Récupérer l'URL publique du service ───────────────
info "Récupération de l'URL du service..."
sleep 3  # Laisser Render initialiser

SVC_RESP=$(curl -sS "$API_BASE/services/$SERVICE_ID" \
  -H "$AUTH" -H "Accept: application/json" 2>&1)
RENDER_URL=$(echo "$SVC_RESP" | python3 -c "
import sys,json
d = json.load(sys.stdin)
url = d.get('serviceDetails',{}).get('url','')
if not url:
  slug = d.get('slug','')
  if slug: url = f'https://{slug}.onrender.com'
print(url)
" 2>/dev/null || echo "")

if [[ -z "$RENDER_URL" || "$RENDER_URL" == "https://.onrender.com" ]]; then
  RENDER_URL="https://creussite-backend.onrender.com"
  warn "URL exacte pas encore disponible. URL probable : $RENDER_URL"
else
  ok "URL du service : $RENDER_URL"
fi

# ── Mettre à jour les fichiers du projet ──────────────
info "Mise à jour des URLs dans le code..."

OLD_URL="https://website-production-2f4e.up.railway.app"

# Fichiers frontend (JS)
for f in docs/js/payment.js docs/js/extract.js docs/js/beta.js; do
  if [[ -f "$f" ]]; then
    sed -i "s|$OLD_URL|$RENDER_URL|g" "$f"
  fi
done

# Fichiers backend (tests)
if [[ -f "backend/tests/checkout.test.js" ]]; then
  sed -i "s|$OLD_URL|$RENDER_URL|g" "backend/tests/checkout.test.js"
fi

# Admin
if [[ -f "docs/admin.html" ]]; then
  sed -i "s|$OLD_URL|$RENDER_URL|g" "docs/admin.html"
fi

# Script connect-services
if [[ -f "connect-services.sh" ]]; then
  sed -i "s|$OLD_URL|$RENDER_URL|g" "connect-services.sh"
fi

# Docs
for f in CLAUDE.md README.md; do
  if [[ -f "$f" ]]; then
    sed -i "s|$OLD_URL|$RENDER_URL|g" "$f"
    sed -i "s|Railway|Render|g" "$f" 2>/dev/null || true
  fi
done

ok "URLs mises à jour dans tous les fichiers."

# ── Résumé ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Migration terminée !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Service Render  : ${CYAN}$RENDER_URL${NC}"
echo -e "  Service ID      : ${CYAN}$SERVICE_ID${NC}"
echo -e "  Dashboard       : ${CYAN}https://dashboard.render.com${NC}"
echo ""
echo -e "${YELLOW}Actions restantes :${NC}"
echo ""
echo "  1. Vérifie que le déploiement est OK sur le dashboard Render"
echo ""
echo "  2. Mets à jour le webhook Stripe :"
echo "     → https://dashboard.stripe.com/webhooks"
echo "     → Modifie l'URL de l'endpoint webhook vers :"
echo -e "       ${CYAN}${RENDER_URL}/webhook${NC}"
echo ""
echo "  3. Commit et push les changements d'URL :"
echo "     git add -A && git commit -m 'chore: migration Railway → Render' && git push"
echo ""
echo "  4. Supprime le projet Railway :"
echo "     → https://railway.app/dashboard"
echo "     → amiable-reflection → Settings → Delete Project"
echo ""
echo "  5. (Optionnel) Sauvegarde ta clé API Render dans backend/.env :"
echo "     echo 'RENDER_API_KEY=$API_KEY' >> backend/.env"
echo ""
