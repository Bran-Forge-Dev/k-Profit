-- ============================================================
-- K-PROFIT · RLS CON VERIFICACIÓN DE LICENCIA
-- ============================================================
-- Corre esto UNA VEZ en el SQL Editor, DESPUÉS de perfiles.sql.
--
-- Antes: el bloqueo por licencia solo existía en el frontend
-- (obtenerUsuario). Un usuario con conocimientos podía llamar la
-- API directo con su token y seguir usando sus datos vencido.
--
-- Ahora las políticas exigen: ser dueño de la fila (user_id)
-- Y tener licencia vigente (perfiles.fecha_vencimiento >= hoy).
--
-- NOTA: el usuario demo del portafolio conviene darle una fecha
-- lejana para que no expire con visitantes:
--   update perfiles set fecha_vencimiento = '2099-12-31'
--   where id = '<uuid-del-usuario-demo>';
-- ============================================================

drop policy if exists "owner" on dev_productos;
create policy "owner" on dev_productos for all
    using (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ))
    with check (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ));

drop policy if exists "owner" on dev_insumos;
create policy "owner" on dev_insumos for all
    using (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ))
    with check (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ));

drop policy if exists "owner" on dev_recetas;
create policy "owner" on dev_recetas for all
    using (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ))
    with check (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ));

drop policy if exists "owner" on dev_ventas;
create policy "owner" on dev_ventas for all
    using (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ))
    with check (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ));

drop policy if exists "owner" on dev_cajas_financieras;
create policy "owner" on dev_cajas_financieras for all
    using (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ))
    with check (auth.uid() = user_id and exists (
        select 1 from perfiles p
        where p.id = auth.uid() and p.fecha_vencimiento >= current_date
    ));
