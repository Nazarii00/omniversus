-- ============================================================
-- Додає відсутні колонки до таблиці profiles у Supabase
-- Виконайте цей SQL у Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Додаємо колонку supabaseId (якщо ще не існує)
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;

-- 2. Додаємо колонку clearance (якщо ще не існує)
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "clearance" TEXT NOT NULL DEFAULT 'SIGMA-1';

-- 3. Додаємо колонку reputation (якщо ще не існує)
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "reputation" INTEGER NOT NULL DEFAULT 0;

-- 4. Додаємо колонку credits (якщо ще не існує)
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "credits" INTEGER NOT NULL DEFAULT 100;

-- 5. Додаємо унікальний індекс для supabaseId (якщо ще не існує)
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_supabaseId_key" ON "profiles"("supabaseId");

-- 6. Встановлюємо gen_random_uuid() як дефолт для id (якщо ще не встановлено)
ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- ============================================================
-- Перевірка: показуємо всі колонки таблиці profiles
-- ============================================================
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;