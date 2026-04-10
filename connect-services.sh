#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# connect-services.sh — Connexion rapide aux services C'Réussite
#
# Usage :
#   ./connect-services.sh           → Affiche le menu interactif
#   ./connect-services.sh railway   → Lien direct Railway
#   ./connect-services.sh logs      → Logs Railway en direct
#   ./connect-services.sh health    → Health check backend
#   ./connect-services.sh supabase  → Requête Supabase (dernières commandes)
#   ./connect-services.sh env       → Affiche les variables Railway
#   ./connect-services.sh local     → Lance le backend en local
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Constantes projet ──────────────────────────────────────────
RAILWAY_PROJECT="amiable-reflection"
RAILWAY_SERVICE="website"
RAILWAY_ENV="production"
BACKEND_URL="https://website-production-2f4e.up.railway.app"
SUPABASE_URL="https://llomqecxvbefakyysskn.supabase.co"
FRONTEND_URL="https://c-reussite.fr"
GITHUB_REPO="CReussite/website"

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()  { echo -e "${CYAN}ℹ ${NC}$*"; }
ok()    { echo -e "${GREEN}✓ ${NC}$*"; }
warn()  { echo -e "${YELLOW}⚠ ${NC}$*"; }
fail()  { echo -e "${RED}✗ ${NC}$*"; }

# ── Fonctions ──────────────────────────────────────────────────

railway_link() {
  info "Liaison Railway au projet ${RAILWAY_PROJECT} / ${RAILWAY_SERVICE}..."
  railway link \
    --project "$RAILWAY_PROJECT" \
    --service "$RAILWAY_SERVICE" \
    --environment "$RAILWAY_ENV" 2>&1 && ok "Railway lié." || fail "Échec liaison Railway."
}

railway_status() {
  info "Statut Railway :"
  railway status 2>&1
}

railway_logs() {
  info "Logs Railway (Ctrl+C pour quitter) :"
  railway logs --tail 2>&1
}

railway_env() {
  info "Variables d'environnement Railway :"
  railway variables 2>&1
}

health_check() {
  info "Health check backend..."
  local resp
  resp=$(curl -s --max-time 10 "${BACKEND_URL}/api/healthz" 2>&1) || { fail "Backend injoignable."; return 1; }
  echo "$resp" | python3 -m json.tool 2>/dev/null || echo "$resp"
  if echo "$resp" | grep -q '"ok"'; then
    ok "Backend OK."
  else
    warn "Backend dégradé — vérifier les variables manquantes."
  fi

  info "Health check frontend..."
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL" 2>&1) || http_code="000"
  if [[ "$http_code" == "200" ]]; then
    ok "Frontend OK (HTTP $http_code)."
  else
    warn "Frontend HTTP $http_code."
  fi
}

supabase_query() {
  if [[ ! -f "backend/.env" ]]; then
    fail "backend/.env introuvable — impossible de lire les clés Supabase."
    warn "Crée backend/.env avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY."
    return 1
  fi
  # shellcheck source=/dev/null
  source backend/.env 2>/dev/null
  if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    fail "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans backend/.env"
    return 1
  fi

  local query="${1:-SELECT id, email, product_id, amount, created_at FROM orders ORDER BY created_at DESC LIMIT 10}"
  info "Requête Supabase : $query"
  curl -s "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\"}" 2>&1 | python3 -m json.tool 2>/dev/null || echo "(réponse brute ci-dessus)"
}

run_local() {
  if [[ ! -f "backend/.env" ]]; then
    warn "backend/.env introuvable. Création d'un template..."
    cat > backend/.env <<'ENVEOF'
# ── C'Réussite — Variables locales ──
# Copier les valeurs depuis Railway : ./connect-services.sh env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://llomqecxvbefakyysskn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
BREVO_API_KEY=xkeysib-...
FROM_EMAIL=contact@c-reussite.fr
FROM_NAME=C'Réussite
ADMIN_KEY=...
ENVEOF
    warn "Remplis backend/.env avec les vraies valeurs, puis relance."
    return 1
  fi
  info "Lancement backend local..."
  cd backend && npm install && node server.js
}

show_menu() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo -e "${CYAN}   C'Réussite — Connexion aux services${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  Projet Railway  : ${YELLOW}${RAILWAY_PROJECT}${NC} / ${RAILWAY_SERVICE}"
  echo -e "  Backend         : ${YELLOW}${BACKEND_URL}${NC}"
  echo -e "  Frontend        : ${YELLOW}${FRONTEND_URL}${NC}"
  echo -e "  Supabase        : ${YELLOW}${SUPABASE_URL}${NC}"
  echo -e "  GitHub          : ${YELLOW}https://github.com/${GITHUB_REPO}${NC}"
  echo ""
  echo "  1) railway   — Lier le CLI Railway au projet"
  echo "  2) status    — Statut Railway"
  echo "  3) logs      — Logs Railway en direct"
  echo "  4) env       — Variables d'environnement Railway"
  echo "  5) health    — Health check (backend + frontend)"
  echo "  6) local     — Lancer le backend en local"
  echo "  7) quit      — Quitter"
  echo ""
  read -rp "Choix [1-7] : " choice
  case "$choice" in
    1) railway_link ;;
    2) railway_status ;;
    3) railway_logs ;;
    4) railway_env ;;
    5) health_check ;;
    6) run_local ;;
    7) exit 0 ;;
    *) warn "Choix invalide." ;;
  esac
}

# ── Point d'entrée ─────────────────────────────────────────────
case "${1:-menu}" in
  railway)  railway_link ;;
  status)   railway_status ;;
  logs)     railway_logs ;;
  env)      railway_env ;;
  health)   health_check ;;
  supabase) supabase_query "${2:-}" ;;
  local)    run_local ;;
  menu|*)   show_menu ;;
esac
