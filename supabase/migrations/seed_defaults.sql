-- Empresa default ALX (apenas visualização no admin, fluxo real ainda usa hardcoded)
insert into public.companies (id, slug, name, is_active, max_users, enable_fila, enable_ranking, enable_historico, enable_entregador_portal, allowed_hotzones)
values (
    '00000000-0000-0000-0000-000000000001',
    'alx',
    'ALX',
    true,
    20,
    true,
    true,
    true,
    true,
    array['Bangu', 'Santa Cruz', 'Tijuca', 'Nilópolis', 'Zona Sul', 'Méier', 'Madureira']
)
on conflict (slug) do nothing;

-- Usuário admin plataforma (armazenado na própria companies? Não — usamos credencial em .env ou este usuário especial)
-- NOTA: O login platform_admin usa VITE_PLATFORM_ADMIN_USERNAME / VITE_PLATFORM_ADMIN_PASSWORD_HASH via store no front.
-- Opcionalmente, caso queira persistir o admin no banco, use a tabela abaixo:
create table if not exists public.platform_admins (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    password_hash text not null,
    display_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

grant select, insert, update on public.platform_admins to anon, authenticated;
