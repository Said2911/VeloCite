-- Migration: 003_price_history
-- Description: Price history tracking for market trend analysis

CREATE TABLE price_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price_usd       DECIMAL(14,2) NOT NULL,
    price_local     DECIMAL(14,2),
    currency_code   CHAR(3)
);

-- Index for trend queries (listing + time range)
CREATE INDEX idx_price_history_listing
    ON price_history (listing_id, recorded_at DESC);

-- Index for market-wide time queries
CREATE INDEX idx_price_history_time
    ON price_history (recorded_at DESC);