-- Portfolio.AI — Migración Supabase
-- Prefijo: portfolioai_
-- Correr en: Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS portfolioai_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  ticker      text NOT NULL,
  price_mxn   numeric(14, 4) NOT NULL,
  source      text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (date, ticker)
);

CREATE TABLE IF NOT EXISTS portfolioai_positions (
  ticker        text PRIMARY KEY,
  name          text NOT NULL,
  category      text NOT NULL,
  quantity      numeric(18, 6) NOT NULL,
  buy_price_mxn numeric(14, 4) NOT NULL,
  buy_date      date NOT NULL,
  source        text NOT NULL,
  is_active     boolean DEFAULT true,
  notes         text
);

CREATE INDEX IF NOT EXISTS idx_portfolioai_snapshots_ticker ON portfolioai_snapshots (ticker);
CREATE INDEX IF NOT EXISTS idx_portfolioai_snapshots_date   ON portfolioai_snapshots (date DESC);

-- ⚠️ Ajusta quantity y buy_price_mxn con tus datos reales
INSERT INTO portfolioai_positions (ticker, name, category, quantity, buy_price_mxn, buy_date, source) VALUES
  ('VOO',       'Vanguard S&P 500 ETF',       'etf',    10,        576.25,  '2023-01-15', 'databursatil'),
  ('XLV',       'Health Care Select SPDR',    'etf',    8,         2667.00, '2023-03-10', 'databursatil'),
  ('VWO',       'Vanguard Emerging Markets',  'etf',    25,        390.00,  '2023-05-20', 'databursatil'),
  ('VXUS',      'Vanguard Total Intl Stock',  'etf',    18,        789.00,  '2023-06-01', 'databursatil'),
  ('IYW',       'iShares US Technology',      'etf',    5,         1419.00, '2023-07-15', 'databursatil'),
  ('FMTY14',    'Fibra Monterrey',            'fibra',  5399,      11.78,   '2022-09-01', 'databursatil'),
  ('DANHOS13',  'Fibra Danhos',               'fibra',  3765,      17.19,   '2022-09-01', 'databursatil'),
  ('BTC',       'Bitcoin',                    'cripto', 0.0429,    28157.0, '2021-11-01', 'coingecko'),
  ('ETH',       'Ethereum',                   'cripto', 1.11,      1789.0,  '2021-11-01', 'coingecko'),
  ('USD-MXN',   'Dolares en efectivo',        'fx',     683,       17.55,   '2023-01-01', 'manual'),
  ('SMARTCASH', 'GBM Smart Cash',             'bono',   111257,    1.00,    '2022-01-01', 'manual'),
  ('NOVA',      'Nova Bono Privado',          'bono',   1,         70000.0, '2023-01-01', 'manual')
ON CONFLICT (ticker) DO NOTHING;

ALTER TABLE portfolioai_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolioai_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolioai_read_snapshots" ON portfolioai_snapshots FOR SELECT USING (true);
CREATE POLICY "portfolioai_read_positions" ON portfolioai_positions FOR SELECT USING (true);
