-- Migration: Add company_name column to profiles table
ALTER TABLE profiles ADD COLUMN company_name text;
