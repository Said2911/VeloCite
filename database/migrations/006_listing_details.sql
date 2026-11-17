-- Migration: 006_listing_details
-- Description: Columns used by scrapers (link to the original listing, description)
-- and indexes for sorting and segment queries

ALTER TABLE listings ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_listed_at ON listings (listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_segment
    ON listings (country_code, city, property_type, listing_type);
