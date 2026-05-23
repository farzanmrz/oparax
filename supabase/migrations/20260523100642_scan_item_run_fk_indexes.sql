create index if not exists scan_items_first_scan_run_id_idx
  on public.scan_items (first_scan_run_id);

create index if not exists scan_items_last_scan_run_id_idx
  on public.scan_items (last_scan_run_id);
