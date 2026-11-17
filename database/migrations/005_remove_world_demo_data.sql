-- Migration: 005_remove_world_demo_data
-- Description: VeloCite now covers Azerbaijan only. Remove the generated/seed demo
-- listings for other countries (price history cascades). Real scraped data is kept.

DELETE FROM listings
WHERE country_code <> 'AZ'
  AND source IN ('generated', 'seed');
