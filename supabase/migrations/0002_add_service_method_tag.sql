-- Add V2 delivery-method positioning to catalog services.

alter table services
  add column if not exists method_tag text;

alter table services
  drop constraint if exists services_method_tag_check;

alter table services
  add constraint services_method_tag_check
  check (method_tag is null or method_tag in ('AI POWERED','HYBRID','ARTISAN'));

create index if not exists services_method_tag_idx on services(method_tag);

update services
set method_tag = case name
  when 'Social post (single)' then 'AI POWERED'
  when 'Email campaign' then 'AI POWERED'
  when 'Website Maintenance (system task)' then 'AI POWERED'
  when 'Whitepaper or case study' then 'ARTISAN'
  when 'Pitch deck' then 'ARTISAN'
  when 'Brand strategy doc' then 'ARTISAN'
  when 'Press article' then 'ARTISAN'
  when 'Photography (half day)' then 'ARTISAN'
  when 'Strategy: Quarterly Plan (system task)' then 'ARTISAN'
  else 'HYBRID'
end
where method_tag is null
  and name in (
    'Social post (single)',
    'Email campaign',
    'Website Maintenance (system task)',
    'Social carousel (5 slides)',
    'Blog graphic',
    'Web page (single)',
    'Long-form article',
    'Video ad (15s to 30s)',
    'Infographic',
    'SEO audit',
    'Monthly Content System (system task)',
    'Whitepaper or case study',
    'Pitch deck',
    'Brand strategy doc',
    'Press article',
    'Photography (half day)',
    'Strategy: Quarterly Plan (system task)'
  );
