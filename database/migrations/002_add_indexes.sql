-- Migration: 002_add_indexes
-- Description: Spatial and composite indexes for high-performance search

-- Spatial index for geo queries (most critical for radius search)
CREATE INDEX idx_listings_location
    ON listings USING GIST (location);

-- Composite index for the most common filter combination
CREATE INDEX idx_listings_filters
    ON listings (country_code, city, property_type, bedrooms, area_sqm);

-- Price range filtering
CREATE INDEX idx_listings_price
    ON listings (country_code, price_usd);

-- Active listings only (partial index — smaller, faster)
CREATE INDEX idx_listings_active
    ON listings (is_active) WHERE is_active = TRUE;

-- Value score sorting
CREATE INDEX idx_listings_value_score
    ON listings (value_score DESC NULLS LAST);