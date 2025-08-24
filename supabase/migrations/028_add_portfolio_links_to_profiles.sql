-- Migration: Add portfolio_links column to profiles table
ALTER TABLE profiles ADD COLUMN portfolio_links text;
