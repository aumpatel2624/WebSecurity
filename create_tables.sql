CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  duration INTEGER NOT NULL,
  overall_risk TEXT NOT NULL,
  security_score INTEGER NOT NULL,
  ssl JSONB NOT NULL,
  headers JSONB NOT NULL,
  ports JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL
);
