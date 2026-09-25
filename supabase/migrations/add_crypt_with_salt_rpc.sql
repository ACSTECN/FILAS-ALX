-- Migration: add_crypt_with_salt_rpc
-- Cria RPC wrapper seguro para pgcrypto crypt() com gensalt('bf') usada pelo adminStore
-- ao criar senhas de company_users. Usa SECURITY DEFINER para funcionar em anon/authenticated.

CREATE OR REPLACE FUNCTION public.crypt_with_salt(password_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF password_text IS NULL OR password_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN public.crypt(password_text, public.gensalt('bf'));
END;
$$;

ALTER FUNCTION public.crypt_with_salt(TEXT) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.crypt_with_salt(TEXT) TO anon, authenticated, service_role;
