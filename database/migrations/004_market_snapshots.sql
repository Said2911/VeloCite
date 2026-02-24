-- Migration: 004_market_snapshots
-- Description: Aggregated market data computed by Pandas analytics engine

CREATE TABLE market_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code    CHAR(2) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    property_type   VARCHAR(20) NOT NULL,
    snapshot_date   DATE NOT NULL,

    -- Computed by Pandas engine nightly
    avg_price_sqm   DECIMAL(10,2),
    median_price    DECIMAL(14,2),
    min_price       DECIMAL(14,2),
    max_price       DECIMAL(14,2),
    listing_count   INTEGER,

    -- Trend vs previous 30 days (percentage)
    price_trend_30d DECIMAL(5,2),

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (country_code, city, property_type, snapshot_date)
);

-- Index for fast market comparison queries
CREATE INDEX idx_snapshots_market
    ON market_snapshots (country_code, city, property_type, snapshot_date DESC);