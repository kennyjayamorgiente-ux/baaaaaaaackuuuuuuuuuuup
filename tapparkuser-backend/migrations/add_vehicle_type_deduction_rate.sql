-- Add vehicle_type_deduction_rate column to vehicle_types table
ALTER TABLE vehicle_types 
ADD COLUMN vehicle_type_deduction_rate DECIMAL(10,2) DEFAULT 50.00 COMMENT 'Hourly deduction rate for this vehicle type';

-- Update existing vehicle types with default rates
UPDATE vehicle_types SET vehicle_type_deduction_rate = 50.00 WHERE vehicle_type_name = 'Car';
UPDATE vehicle_types SET vehicle_type_deduction_rate = 30.00 WHERE vehicle_type_name = 'Motorcycle';
UPDATE vehicle_types SET vehicle_type_deduction_rate = 15.00 WHERE vehicle_type_name = 'Bicycle';
