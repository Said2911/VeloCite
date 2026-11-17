-- Migration: 001_create_listings
-- Description: Core listings table with PostGIS geography support

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS listings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id     VARCHAR(255) UNIQUE,

    -- Location
    country_code    CHAR(2) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    address         TEXT,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,

    -- Property details
    property_type   VARCHAR(20) NOT NULL,
    listing_type    VARCHAR(10) NOT NULL,
    area_sqm        DECIMAL(10,2),
    bedrooms        SMALLINT,
    bathrooms       SMALLINT,
    floor           SMALLINT,
    total_floors    SMALLINT,
    year_built      SMALLINT,

    -- Pricing (always stored in USD internally)
    price_usd       DECIMAL(14,2) NOT NULL,
    price_per_sqm   DECIMAL(10,2) GENERATED ALWAYS AS
                    (price_usd / NULLIF(area_sqm, 0)) STORED,

    -- Analytics scores (computed later by C++/Pandas engine)
    value_score     DECIMAL(4,2),
    market_position VARCHAR(20),

    -- Flexible features for global diversity
    features        JSONB DEFAULT '{}',

    -- Metadata
    source          VARCHAR(50),
    is_active       BOOLEAN DEFAULT TRUE,
    listed_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_property_type CHECK (
        property_type IN ('apartment','house','villa','land','commercial')
    ),
    CONSTRAINT chk_listing_type CHECK (
        listing_type IN ('sale','rent')
    )
);