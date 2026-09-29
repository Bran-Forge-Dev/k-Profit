-- ============================================================
-- K-PROFIT · LICENCIAS (tabla perfiles + vencimiento)
-- ============================================================
-- Corre esto UNA VEZ en el proyecto actual. Después:
--   - Cada usuario nuevo (Auth > Add user) obtiene 30 días de
--     licencia automáticamente vía trigger.
--   - Al crear el usuario, en "User Metadata" puedes pegar:
--       {"nombre_negocio": "Pollos Juan", "whatsapp": "5281..."}
--     El trigger lo copia a su perfil.
--   - Renovar a alguien que pagó (suma 30 días sin perder vigencia previa):
--       update perfiles
--       set fecha_vencimiento = greatest(fecha_vencimiento, current_date) + 30
--       where id = (select id from auth.users where email = 'cliente@negocio.com');
--   - Suspender manualmente: fecha_vencimiento = current_date - 1.
--   - Ver clientes y vencimientos (tu registro de clientes):
--       select p.nombre_negocio, u.email, p.whatsapp, p.fecha_vencimiento,
--              p.fecha_vencimiento - current_date as dias_restantes
--       from perfiles p join auth.users u on u.id = p.id
--       order by p.fecha_vencimiento;
--   - Los usuarios existentes reciben 30 días con el backfill de abajo.
-- ============================================================

create table if not exists perfiles (
    id                uuid primary key references auth.users(id),
    fecha_vencimiento date not null,
    nombre_negocio    text,
    whatsapp          text,
    created_at        timestamptz default now()
);

-- Por si la tabla ya existía sin estas columnas
alter table perfiles add column if not exists nombre_negocio text;
alter table perfiles add column if not exists whatsapp text;

alter table perfiles enable row level security;

-- Cada usuario solo puede LEER su propio perfil (no puede editar su fecha)
drop policy if exists "own_profile_read" on perfiles;
create policy "own_profile_read" on perfiles
    for select using (auth.uid() = id);

-- Perfil automático con 30 días + cajas financieras base (40/10/50)
-- al crear un usuario en Auth
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.perfiles (id, fecha_vencimiento, nombre_negocio, whatsapp)
    values (
        new.id,
        current_date + 30,
        new.raw_user_meta_data->>'nombre_negocio',
        new.raw_user_meta_data->>'whatsapp'
    )
    on conflict (id) do nothing;

    insert into public.dev_cajas_financieras (user_id, nombre, porcentaje, saldo_acumulado)
    values
        (new.id, 'Surtido', 40, 0),
        (new.id, 'Gastos',  10, 0),
        (new.id, 'Salario', 50, 0)
    on conflict do nothing;

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

-- Backfill: cajas 40/10/50 a usuarios existentes que aún no las tengan
insert into dev_cajas_financieras (user_id, nombre, porcentaje, saldo_acumulado)
select u.id, c.nombre, c.porcentaje, 0
from auth.users u
cross join (values ('Surtido', 40), ('Gastos', 10), ('Salario', 50)) as c(nombre, porcentaje)
where not exists (
    select 1 from dev_cajas_financieras cf
    where cf.user_id = u.id and cf.nombre = c.nombre
);
