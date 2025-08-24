-- Migration: Add vat_number column to profiles table
ALTER TABLE profiles ADD COLUMN vat_number text;
