-- Run this in Supabase SQL editor if you already ran migration.sql
-- Adds deduplication column to inbound_messages
alter table inbound_messages add column if not exists message_id text unique;
