-- Ejecutar en el SQL Editor del mismo proyecto del inventario.
begin;
create table if not exists public.machine_catalog_records (
  inventory_code text primary key check (inventory_code ~ '^P[0-9]{6}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);
alter table public.machine_catalog_records enable row level security;
revoke all on public.machine_catalog_records from anon, authenticated;
grant select on public.machine_catalog_records to authenticated;
create policy machine_catalog_member_read on public.machine_catalog_records for select to authenticated
using ((select public.inventory_is_member()));
create or replace function public.save_machine_catalog_records(p_records jsonb)
returns table(inventory_code text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  entry jsonb;
  code text;
  expected integer;
  previous public.machine_catalog_records;
  saved public.machine_catalog_records;
begin
  if actor is null or not public.inventory_is_member() then
    raise exception 'No tenés acceso al catálogo.' using errcode='42501';
  end if;
  if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records)>500 then
    raise exception 'Lote inválido.' using errcode='22023';
  end if;
  for entry in select value from jsonb_array_elements(p_records) order by value->>'code' loop
    code := entry->>'code';
    expected := (entry->>'revision')::integer;
    if code is null or code !~ '^P[0-9]{6}$' or expected is null or expected<0
      or jsonb_typeof(entry->'payload') is distinct from 'object'
      or (entry->'payload'->>'inventory') is distinct from code
      or not exists(select 1 from public.inventory_items i where i.code=code) then
      raise exception 'Inventario o ficha inválidos: %',code using errcode='22023';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('machine-catalog:'||code,0));
    select * into previous from public.machine_catalog_records m where m.inventory_code=code for update;
    if previous.inventory_code is not null and previous.payload=entry->'payload' then
      saved:=previous;
    elsif coalesce(previous.revision,0)<>expected then
      raise exception 'Conflicto de edición en %. Leé el catálogo compartido antes de guardar.',code using errcode='40001';
    elsif previous.inventory_code is null then
      insert into public.machine_catalog_records(inventory_code,payload,updated_by)
      values(code,entry->'payload',actor) returning * into saved;
    else
      update public.machine_catalog_records m set payload=entry->'payload',revision=m.revision+1,
        updated_at=now(),updated_by=actor where m.inventory_code=code returning * into saved;
    end if;
    inventory_code:=saved.inventory_code; revision:=saved.revision; return next;
  end loop;
end;
$$;
revoke all on function public.save_machine_catalog_records(jsonb) from public, anon;
grant execute on function public.save_machine_catalog_records(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
