-- Supabase > SQL Editor içinde bir kez çalıştırın.
create table if not exists service_requests (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 80),
  email       text not null check (char_length(email) <= 254),
  service     text not null check (service in ('kamera', 'yangin', 'gecis', 'periyodik')),
  description text not null check (char_length(description) between 20 and 1000),
  created_at  timestamptz not null default now()
);

-- Supabase tabloları varsayılan olarak REST API (anon key) üzerinden de erişilebilir.
-- RLS'i açıp hiç politika eklememek bu yolu tamamen kapatır.
-- Bizim sunucumuz doğrudan Postgres bağlantısıyla (postgres rolü) yazdığı için etkilenmez.
alter table service_requests enable row level security;
