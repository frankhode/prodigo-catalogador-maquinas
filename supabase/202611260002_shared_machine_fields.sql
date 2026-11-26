-- Ejecutar en el proyecto Supabase de Pródigo después de 202611250001_machine_catalog
-- y 202611260001_guided_intake. No modifica ningún registro existente.
begin;
create or replace function public.save_machine_catalog_shared(p_records jsonb)
returns table(inventory_code text, revision integer, inventory jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  entry jsonb;
  v_code text;
  v_expected integer;
  v_inventory_revision integer;
  v_item_id uuid;
  v_item public.inventory_items;
  v_previous public.machine_catalog_records;
  v_saved public.machine_catalog_records;
  v_patch jsonb;
  v_payload jsonb;
  v_values jsonb;
  v_details jsonb;
  v_fields jsonb;
begin
  if actor is null or not public.inventory_is_member() then
    raise exception 'No tenés acceso al catálogo.' using errcode='42501';
  end if;
  if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records)>500 then
    raise exception 'Lote inválido.' using errcode='22023';
  end if;
  if jsonb_array_length(p_records) <> (select count(distinct value->>'code') from jsonb_array_elements(p_records)) then
    raise exception 'Códigos repetidos o inválidos.' using errcode='22023';
  end if;
  for entry in select value from jsonb_array_elements(p_records) order by value->>'code' loop
    v_code := entry->>'code';
    v_expected := (entry->>'revision')::integer;
    v_inventory_revision := (entry->>'inventory_revision')::integer;
    v_patch := entry->'changes';
    v_payload := entry->'payload';
    if v_code is null or v_code !~ '^P[0-9]{6}$' or v_expected is null or v_expected<0
      or v_inventory_revision is null or v_inventory_revision<1
      or jsonb_typeof(v_payload) is distinct from 'object'
      or (v_payload->>'inventory') is distinct from v_code
      or jsonb_typeof(v_patch) is distinct from 'object' then
      raise exception 'Inventario o ficha inválidos: %',v_code using errcode='22023';
    end if;
    if exists (select 1 from jsonb_each(v_patch) as p(k,v)
      where p.k not in ('brand','model','year','serial','inventoryNotes','color','version','country','keyboardLanguage','keyboardLayout')
        or jsonb_typeof(p.v) is distinct from 'string'
        or (p.k in ('color','version','country','keyboardLanguage','keyboardLayout') and length(p.v#>>'{}')>240)) then
      raise exception 'Campos comunes inválidos: %',v_code using errcode='22023';
    end if;
    if (v_patch ? 'version') <> (v_patch ? 'country')
      or (v_patch ? 'keyboardLanguage') <> (v_patch ? 'keyboardLayout') then
      raise exception 'Los campos de versión/país y teclado deben enviarse juntos.' using errcode='22023';
    end if;

    -- Same per-object lock and version mechanism as the inventory interface.
    perform pg_advisory_xact_lock(hashtextextended('machine-catalog:'||v_code,0));
    select i.id into v_item_id from public.inventory_items i where i.code=v_code;
    if v_item_id is null then raise exception 'No existe el objeto %.',v_code using errcode='22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_item_id::text,0));
    select * into v_item from public.inventory_items i where i.id=v_item_id for update;
    if v_item.id is null or translate(lower(btrim(regexp_replace(v_item.category,'[[:space:]]+',' ','g'))),'á','a') !~ '^maquinas? (de )?escribir$'
      or v_item.destination is distinct from 'museo' then
      raise exception 'El objeto % ya no es una máquina del museo.',v_code using errcode='22023';
    end if;
    if v_item.revision<>v_inventory_revision then
      raise exception 'El inventario de % cambió. Actualizá antes de guardar.',v_code using errcode='40001';
    end if;
    select * into v_previous from public.machine_catalog_records m where m.inventory_code=v_code for update;
    if coalesce(v_previous.revision,0)<>v_expected then
      raise exception 'Conflicto de catalogación en %. Actualizá antes de guardar.',v_code using errcode='40001';
    end if;

    if v_patch<>'{}'::jsonb then
      v_values:=jsonb_build_object(
        'category',v_item.category,
        'brand',coalesce(v_patch->>'brand',v_item.brand),
        'model',coalesce(v_patch->>'model',v_item.model),
        'manufacture_date',coalesce(v_patch->>'year',v_item.manufacture_date),
        'original_number',coalesce(v_patch->>'serial',v_item.original_number),
        'type',coalesce(v_patch->>'version',v_item.type),
        'notes',coalesce(v_patch->>'inventoryNotes',v_item.notes),
        'destination',v_item.destination);
      if v_patch ?| array['color','version','country','keyboardLanguage','keyboardLayout'] then
        v_details:=coalesce(v_item.guided_details,'{"group":"Oficina","fields":{}}'::jsonb);
        v_fields:=coalesce(v_details->'fields','{}'::jsonb);
        if v_patch ? 'color' then v_fields:=v_fields||jsonb_build_object('Color',v_patch->>'color'); end if;
        if v_patch ? 'version' then
          if v_fields ? 'Versión / país' and not (v_fields ? 'Versión / país (dato anterior)') then
            v_fields:=v_fields||jsonb_build_object('Versión / país (dato anterior)',v_fields->'Versión / país');
          end if;
          v_fields:=(v_fields-'Versión / país')||jsonb_build_object('País',v_patch->>'country');
        end if;
        if v_patch ? 'keyboardLanguage' then
          v_fields:=(v_fields-'Teclado')||jsonb_build_object('Idioma del teclado',v_patch->>'keyboardLanguage','Distribución del teclado',v_patch->>'keyboardLayout');
        end if;
        v_values:=v_values||jsonb_build_object('guided_details',jsonb_set(v_details,'{fields}',v_fields));
      end if;
      -- Reuse the existing inventory RPC for validation, vocabulary normalization,
      -- updated_by and revisions. Omitting the gallery keeps all photos unchanged.
      select * into v_item from public.save_inventory_item(v_item.id,v_inventory_revision,v_values,v_item.photo_path);
    end if;
    if v_payload->>'status'='Catalogada' and (btrim(v_item.brand)='' or btrim(v_item.model)='') then
      raise exception 'Completá marca y modelo antes de catalogar %.',v_code using errcode='22023';
    end if;
    -- Never store live common values a second time inside the cataloguing payload.
    v_payload:=(v_payload-array['brand','model','year','serial','type','inventoryNotes','color','version','country','keyboardLanguage','keyboardLayout','destination'])
      ||jsonb_build_object('sharedInventoryVersion',1);
    if jsonb_typeof(v_payload->'inventorySource')='object' then
      v_payload:=jsonb_set(v_payload,'{inventorySource}',(v_payload->'inventorySource')-array['fields','revision']);
    end if;
    if v_previous.inventory_code is null then
      insert into public.machine_catalog_records(inventory_code,payload,updated_by)
      values(v_code,v_payload,actor) returning * into v_saved;
    elsif v_previous.payload=v_payload then
      v_saved:=v_previous;
    else
      update public.machine_catalog_records m set payload=v_payload,revision=m.revision+1,
        updated_at=now(),updated_by=actor where m.inventory_code=v_code returning * into v_saved;
    end if;
    inventory_code:=v_saved.inventory_code;
    revision:=v_saved.revision;
    inventory:=to_jsonb(v_item);
    return next;
  end loop;
end;
$$;
revoke all on function public.save_machine_catalog_shared(jsonb) from public,anon;
grant execute on function public.save_machine_catalog_shared(jsonb) to authenticated;
-- An old cached cataloguer must refresh rather than write divergent copies.
revoke execute on function public.save_machine_catalog_records(jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
