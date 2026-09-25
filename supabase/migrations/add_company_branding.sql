-- Adiciona campos de branding/identidade visual na tabela companies
-- Nenhuma alteracao na ALX (tudo NULL no DEFAULT = mesma aparencia anterior)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS display_name text NULL,
  ADD COLUMN IF NOT EXISTS favicon_url text NULL,
  ADD COLUMN IF NOT EXISTS primary_color text NULL;
