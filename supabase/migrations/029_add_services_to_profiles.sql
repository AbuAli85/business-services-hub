-- Migration: Add services column to profiles table
ALTER TABLE profiles ADD COLUMN services text;
