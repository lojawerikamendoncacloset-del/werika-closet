-- Catálogo Werika Mendonça Closet — rode tudo de uma vez no Supabase > SQL Editor

-- Peças
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  marca text,
  categoria text,
  preco numeric(10,2),
  descricao text default '',
  tamanhos text[] default '{}',
  fotos text[] default '{}',
  esgotado boolean default false,
  criado_em timestamptz default now()
);

-- Configuração da loja (textos, WhatsApp e blocos da tela inicial) — uma linha só
create table if not exists public.config (
  id int primary key default 1,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz default now(),
  constraint config_uma_linha check (id = 1)
);
insert into public.config (id, dados) values (1, '{}') on conflict (id) do nothing;

-- Segurança: qualquer pessoa vê, só quem fez login (a Werika) altera
alter table public.produtos enable row level security;
alter table public.config enable row level security;

drop policy if exists "todos veem produtos" on public.produtos;
drop policy if exists "loja edita produtos" on public.produtos;
drop policy if exists "todos veem config" on public.config;
drop policy if exists "loja edita config" on public.config;
create policy "todos veem produtos" on public.produtos for select using (true);
create policy "loja edita produtos" on public.produtos for all to authenticated using (true) with check (true);
create policy "todos veem config" on public.config for select using (true);
create policy "loja edita config" on public.config for all to authenticated using (true) with check (true);

-- Fotos (bucket público)
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "todos veem fotos" on storage.objects;
drop policy if exists "loja envia fotos" on storage.objects;
drop policy if exists "loja altera fotos" on storage.objects;
drop policy if exists "loja apaga fotos" on storage.objects;
create policy "todos veem fotos" on storage.objects for select using (bucket_id = 'fotos');
create policy "loja envia fotos" on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
create policy "loja altera fotos" on storage.objects for update to authenticated using (bucket_id = 'fotos');
create policy "loja apaga fotos" on storage.objects for delete to authenticated using (bucket_id = 'fotos');
