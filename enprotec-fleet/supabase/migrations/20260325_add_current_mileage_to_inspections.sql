-- Add current_mileage column to inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS current_mileage INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN inspections.current_mileage IS 'Current mileage in kilometers recorded during inspection';
