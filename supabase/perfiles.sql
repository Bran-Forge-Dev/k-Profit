-- ============================================================
-- K-PROFIT · LICENCIAS (tabla perfiles + vencimiento)
-- ============================================================
-- Corre esto UNA VEZ en el proyecto actual. Después:
--   - Cada usuario nuevo (Auth > Add user) obtiene 30 días de
--     licencia automáticamente vía trigger.
--   - Para renovar a alguien que pagó:
--       update perfiles set fecha_vencimiento = fecha_vencimiento + 30
--       where id = '<uuid-del-usuario>';
--   - Para suspender manualmente: pon la fecha en el pasado.
--   - Los usuarios existentes reciben 30 días con el backfill de abajo.
-- ============================================================

create table if not exists perfiles (
    id                uuid primary key references auth.users(id),
    fecha_vencimiento date not null,
    created_at        timestamptz default now()
);

alter table perfiles enable row level security;

-- Cada usuario solo puede LEER su propio perfil (no puede editar su fecha)
create policy "own_profile_read" on perfiles
    for select using (auth.uid() = id);

-- Perfil automático con 30 días al crear un usuario en Auth
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.perfiles (id, fecha_vencimiento)
    values (new.id, current_date + 30)
    on conflict (id) do nothing;
    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.crear_perfil_nuevo_usuario();

-- Backfill: crea perfil a todos los usuarios que ya existen
insert into perfiles (id, fecha_vencimiento)
select id, current_date + 30 from auth.users
on conflict (id) do nothing;
