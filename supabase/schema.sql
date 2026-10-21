-- ==============================================================================
-- Gderma 치료실 / 검사실 Todo 및 통계 프로그램 Supabase DDL & RLS Schema Script
-- ==============================================================================

-- 1. profiles 테이블 생성 (auth.users 연동)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  room text not null check (room in ('치료실', '검사실')),
  role text default 'staff', -- 'admin' 또는 'staff'
  created_at timestamptz default timezone('utc'::text, now()) not null
);

comment on table public.profiles is '치료실 및 검사실 사용자 프로필 정보';
comment on column public.profiles.room is '소속 실 (치료실 또는 검사실)';

-- 2. todos 테이블 생성
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('치료실', '검사실')),
  title text not null,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default '대기' check (status in ('대기', '완료')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  completed_at timestamptz
);

comment on table public.todos is '치료실 및 검사실 할당 업무 Todo 리스트';
comment on column public.todos.status is '업무 상태 (대기 또는 완료)';

-- 인덱스 생성 (조회 성능 최적화)
create index if not exists idx_todos_assignee on public.todos(assignee_id);
create index if not exists idx_todos_status on public.todos(status);
create index if not exists idx_todos_room on public.todos(room);
create index if not exists idx_todos_created_at on public.todos(created_at desc);

-- 3. todo_logs 테이블 생성 (통계 및 이력 추적용)
create table if not exists public.todo_logs (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid references public.todos(id) on delete set null,
  room text not null,
  title text not null,
  action text not null, -- '등록', '완료', '취소', '수정'
  performed_by uuid references public.profiles(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  assignee_name text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

comment on table public.todo_logs is '업무 변경 이력 및 완료 통계 로그';
create index if not exists idx_todo_logs_created_at on public.todo_logs(created_at desc);
create index if not exists idx_todo_logs_room on public.todo_logs(room);
create index if not exists idx_todo_logs_assignee on public.todo_logs(assignee_id);

-- ==============================================================================
-- 자동화 트리거 및 함수
-- ==============================================================================

-- [트리거 1] 회원가입 시 public.profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, room)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', '직원_' || substr(new.id::text, 1, 4)),
    coalesce(new.raw_user_meta_data->>'room', '치료실')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- [트리거 2] Todo 완료 처리 시 completed_at 자동 갱신 트리거 (BEFORE UPDATE)
create or replace function public.handle_todo_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status = '완료' and old.status = '대기' then
    new.completed_at = coalesce(new.completed_at, timezone('utc'::text, now()));
  elsif new.status = '대기' and old.status = '완료' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_todo_status_change on public.todos;
create trigger on_todo_status_change
  before update on public.todos
  for each row execute procedure public.handle_todo_status_change();

-- [트리거 3] Todo 등록 및 완료 시 todo_logs 자동 기록 트리거 (AFTER INSERT OR UPDATE)
create or replace function public.log_todo_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_assignee_name text;
begin
  select name into v_assignee_name from public.profiles where id = new.assignee_id;

  if (tg_op = 'INSERT') then
    insert into public.todo_logs (todo_id, room, title, action, performed_by, assignee_id, assignee_name, details)
    values (
      new.id,
      new.room,
      new.title,
      '등록',
      auth.uid(),
      new.assignee_id,
      v_assignee_name,
      jsonb_build_object('status', new.status)
    );
  elsif (tg_op = 'UPDATE') then
    if (old.status <> new.status) then
      insert into public.todo_logs (todo_id, room, title, action, performed_by, assignee_id, assignee_name, details)
      values (
        new.id,
        new.room,
        new.title,
        case when new.status = '완료' then '완료' else '대기로 변경' end,
        auth.uid(),
        new.assignee_id,
        v_assignee_name,
        jsonb_build_object('prev_status', old.status, 'new_status', new.status, 'completed_at', new.completed_at)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_todo_activity on public.todos;
create trigger on_todo_activity
  after insert or update on public.todos
  for each row execute procedure public.log_todo_activity();

-- ==============================================================================
-- Row Level Security (RLS) 정책 설정
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.todos enable row level security;
alter table public.todo_logs enable row level security;

-- profiles RLS: 인증된 사용자는 모든 직원의 프로필(이름, 소속실)을 조회 가능 (담당자 배정 목적)
create policy "인증된 사용자는 모든 프로필 조회 가능"
  on public.profiles for select
  to authenticated
  using (true);

create policy "본인 프로필 수정 가능"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- todos RLS: 인증된 사용자는 모든 업무 조회/등록/수정 가능
create policy "인증된 사용자는 전체 Todo 조회 가능"
  on public.todos for select
  to authenticated
  using (true);

create policy "인증된 사용자는 Todo 생성 가능"
  on public.todos for insert
  to authenticated
  with check (auth.role() = 'authenticated');

create policy "인증된 사용자는 Todo 수정(완료 등) 가능"
  on public.todos for update
  to authenticated
  using (auth.role() = 'authenticated');

create policy "인증된 사용자는 Todo 삭제 가능"
  on public.todos for delete
  to authenticated
  using (auth.role() = 'authenticated');

-- todo_logs RLS: 인증된 사용자는 이력/통계 로그 조회 및 생성 가능
create policy "인증된 사용자는 로그 조회 가능"
  on public.todo_logs for select
  to authenticated
  using (true);

create policy "인증된 사용자는 로그 등록 가능"
  on public.todo_logs for insert
  to authenticated
  with check (auth.role() = 'authenticated');

-- ==============================================================================
-- Supabase Realtime 기능 활성화
-- ==============================================================================

-- Supabase Realtime 채널에 todos 및 todo_logs 테이블 등록
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.todo_logs;
alter publication supabase_realtime add table public.profiles;

-- Replica Identity 설정 (변경 전/후 데이터 실시간 전송용)
alter table public.todos replica identity full;
alter table public.todo_logs replica identity full;
alter table public.profiles replica identity full;
