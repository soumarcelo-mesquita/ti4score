-- One row per game. `state` is the whole GameState JSON; `version` is bumped on
-- every write so clients can do compare-and-swap updates.
create table if not exists scoreboards (
  code text primary key,
  state jsonb not null,
  version integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table scoreboards enable row level security;

create policy "Scoreboards are viewable by everyone" on scoreboards for select using (true);
create policy "Anyone can create a scoreboard" on scoreboards for insert with check (true);
create policy "Anyone can update a scoreboard" on scoreboards for update using (true);

-- Push row changes to the TV and phones.
alter publication supabase_realtime add table scoreboards;
