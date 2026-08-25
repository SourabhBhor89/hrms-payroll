-- V25: Add geofence audit fields to attendances table
ALTER TABLE attendances
    ADD COLUMN clock_in_latitude DOUBLE PRECISION,
    ADD COLUMN clock_in_longitude DOUBLE PRECISION,
    ADD COLUMN clock_in_distance_meters DOUBLE PRECISION,
    ADD COLUMN clock_out_latitude DOUBLE PRECISION,
    ADD COLUMN clock_out_longitude DOUBLE PRECISION,
    ADD COLUMN clock_out_distance_meters DOUBLE PRECISION;
