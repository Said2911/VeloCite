-- Seed data for local development
-- 10 real-world example listings across different cities

INSERT INTO listings (
    external_id, country_code, city, district, address,
    location, property_type, listing_type,
    area_sqm, bedrooms, bathrooms, floor, year_built,
    price_usd, value_score, market_position, source
) VALUES
-- Berlin, Germany
('DE001', 'DE', 'Berlin', 'Mitte', 'Unter den Linden 10',
 ST_MakePoint(13.3777, 52.5163)::geography,
 'apartment', 'sale', 75.0, 2, 1, 3, 2005, 420000, 7.2, 'fair_value', 'seed'),

('DE002', 'DE', 'Berlin', 'Prenzlauer Berg', 'Kastanienallee 22',
 ST_MakePoint(13.4105, 52.5397)::geography,
 'apartment', 'rent', 60.0, 1, 1, 2, 1990, 1800, 6.5, 'fair_value', 'seed'),

-- Paris, France
('FR001', 'FR', 'Paris', 'Le Marais', 'Rue de Rivoli 45',
 ST_MakePoint(2.3522, 48.8566)::geography,
 'apartment', 'sale', 55.0, 1, 1, 4, 1920, 650000, 5.1, 'overpriced', 'seed'),

('FR002', 'FR', 'Paris', 'Montmartre', 'Rue Lepic 18',
 ST_MakePoint(2.3387, 48.8867)::geography,
 'apartment', 'sale', 80.0, 2, 1, 5, 1935, 890000, 4.8, 'overpriced', 'seed'),

-- Dubai, UAE
('AE001', 'AE', 'Dubai', 'Downtown', 'Sheikh Mohammed Blvd 1',
 ST_MakePoint(55.2708, 25.1972)::geography,
 'apartment', 'sale', 120.0, 2, 2, 15, 2018, 580000, 8.1, 'underpriced', 'seed'),

('AE002', 'AE', 'Dubai', 'Marina', 'Marina Walk 5',
 ST_MakePoint(55.1390, 25.0805)::geography,
 'apartment', 'rent', 95.0, 2, 2, 10, 2015, 3500, 7.9, 'fair_value', 'seed'),

-- New York, USA
('US001', 'US', 'New York', 'Manhattan', 'Broadway 500',
 ST_MakePoint(-73.9857, 40.7580)::geography,
 'apartment', 'sale', 85.0, 2, 1, 12, 2000, 1200000, 3.2, 'overpriced', 'seed'),

('US002', 'US', 'New York', 'Brooklyn', 'Atlantic Ave 220',
 ST_MakePoint(-73.9442, 40.6782)::geography,
 'apartment', 'sale', 100.0, 3, 2, 2, 1995, 750000, 6.8, 'fair_value', 'seed'),

-- Barcelona, Spain
('ES001', 'ES', 'Barcelona', 'Eixample', 'Passeig de Gracia 88',
 ST_MakePoint(2.1734, 41.3851)::geography,
 'apartment', 'sale', 90.0, 3, 2, 6, 1960, 520000, 7.5, 'fair_value', 'seed'),

-- Tokyo, Japan
('JP001', 'JP', 'Tokyo', 'Shibuya', 'Omotesando 3-5',
 ST_MakePoint(139.7031, 35.6654)::geography,
 'apartment', 'sale', 65.0, 1, 1, 8, 2010, 480000, 6.2, 'fair_value', 'seed');