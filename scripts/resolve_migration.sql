-- Ручне фіксація міграції (обхід advisory lock на Supabase pooler)
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid(),
  '5b3a2c1e8f4d6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
  NOW(),
  '20260605010000_add_profile_supabase_id_and_defaults',
  NULL,
  NULL,
  NOW(),
  1
)
ON CONFLICT (migration_name) DO NOTHING;