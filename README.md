# Portfolio.AI

Dashboard de portafolio de inversiones con análisis por IA.
Stack: Next.js 14 · Supabase · Claude Haiku · DataBursatil · CoinGecko · Vercel

---

## Setup en 4 pasos

### 1. Clonar y configurar
```bash
git clone https://github.com/TU_USUARIO/portfolio-ai
cd portfolio-ai
npm install
cp .env.example .env.local   # llenar las variables
npm run dev
```

### 2. Variables de entorno
Copia `.env.example` a `.env.local` y llena:

| Variable                      | Dónde obtenerla                                  |
|-------------------------------|--------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | Supabase → Settings → API                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API                     |
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase → Settings → API (mantén en secreto)   |
| `ANTHROPIC_API_KEY`           | console.anthropic.com                           |
| `DATABURSATIL_TOKEN`          | databursatil.com → Dashboard                    |
| `CRON_SECRET`                 | Genera uno random: `openssl rand -hex 32`        |

### 3. Migración Supabase
En Supabase → SQL Editor, pega y ejecuta:
```
supabase/migrations/001_portfolioai.sql
```
Ajusta `quantity` y `buy_price_mxn` en el INSERT con tus datos reales.

### 4. Deploy en Vercel
```bash
# Conectar repo en vercel.com → New Project → Import
# Agregar las mismas variables de entorno en Settings → Environment Variables
# El cron queda activo automáticamente via vercel.json (lunes-viernes 18:00 CST)
```

---

## Cómo funciona el snapshot diario

```
Vercel Cron (18:00 CST lunes-viernes)
  └─ GET /api/snapshot
       ├─ DataBursatil → VOO, XLV, VWO, VXUS, IYW, FMTY14, DANHOS13 (MXN)
       ├─ CoinGecko    → BTC, ETH (MXN, sin API key)
       └─ Manual       → USD-MXN, SMARTCASH, NOVA (precio fijo de portfolioai_positions)
            └─ guarda en portfolioai_snapshots (upsert por date+ticker)
```

Para correr el snapshot manualmente:
```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://tu-app.vercel.app/api/snapshot
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── snapshot/route.ts   ← cron diario de precios
│   │   ├── game/route.ts       ← datos del portafolio para el dashboard
│   │   └── chat/route.ts       ← análisis con Claude (streaming)
│   └── dashboard/page.tsx      ← UI principal
├── lib/
│   ├── supabase.ts             ← cliente Supabase
│   └── portfolio.ts            ← fetch DataBursatil + CoinGecko
└── types/index.ts              ← tipos TypeScript

supabase/
└── migrations/
    └── 001_portfolioai.sql     ← tablas portfolioai_*

vercel.json                     ← cron job config
```

---

## Tablas Supabase

Prefijo `portfolioai_` para coexistir con otros proyectos en el mismo Supabase.

- `portfolioai_positions` — tus posiciones (ticker, cantidad, precio de compra)
- `portfolioai_snapshots` — precio diario por ticker (se acumula cada día)
