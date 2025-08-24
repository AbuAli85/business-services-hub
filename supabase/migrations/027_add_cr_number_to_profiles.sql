-- Migration: Add cr_number column to profiles table
ALTER TABLE profiles ADD COLUMN cr_number text;
