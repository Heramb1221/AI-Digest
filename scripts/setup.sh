#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AI Digest — Local setup script
# Run once after cloning: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

echo -e "${BLUE}AI Digest — Setting up local environment${NC}\n"

# 1. Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌  Node.js 18+ required. Current: $(node -v)"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# 2. Install dependencies
echo -e "\n${YELLOW}→${NC} Installing npm packages..."
npm install
echo -e "${GREEN}✓${NC} Packages installed"

# 3. Create .env.local from template
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo -e "${GREEN}✓${NC} Created .env.local from template"
  echo -e "  ${YELLOW}⚠${NC}  Fill in your credentials in .env.local before running the app"
else
  echo -e "${GREEN}✓${NC} .env.local already exists — skipping"
fi

# 4. Generate Prisma client
echo -e "\n${YELLOW}→${NC} Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✓${NC} Prisma client generated"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Fill in your credentials in ${YELLOW}.env.local${NC}"
echo -e "     Required: DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, GEMINI_API_KEY"
echo -e "  2. Push schema to database:"
echo -e "     ${YELLOW}npm run db:push${NC}"
echo -e "  3. Start the dev server:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo -e "  4. Open http://localhost:3000\n"
