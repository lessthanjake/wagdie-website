-- Add optional public enrichment fields for map locations.

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS lore TEXT;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_image_url_length_check
    CHECK (image_url IS NULL OR char_length(image_url) <= 2048),
  ADD CONSTRAINT locations_lore_length_check
    CHECK (lore IS NULL OR char_length(lore) <= 5000);

COMMENT ON COLUMN public.locations.image_url IS
  'Optional root-relative or HTTP(S) image URL rendered in public map location details.';

COMMENT ON COLUMN public.locations.lore IS
  'Optional extended plain-text lore rendered in public map location details.';
