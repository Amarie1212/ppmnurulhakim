-- Migration: Add KK and KTP upload fields to santri table
-- Created: 2025-12-24

ALTER TABLE santri 
ADD COLUMN kk_path VARCHAR(255),
ADD COLUMN ktp_path VARCHAR(255);
