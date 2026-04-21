-- 최근 30일 저가치/중복 포스트 정리 스크립트
--
-- 범위
-- - KST 기준 오늘 포함 최근 30일
--
-- 권장 순서
-- 1) PREVIEW 섹션으로 삭제 대상을 먼저 확인
-- 2) BACKUP 섹션으로 삭제 대상을 백업
-- 3) DELETE FALLBACK POSTS 실행
-- 4) DELETE DUPLICATE POSTS 실행
-- 5) VERIFY 섹션으로 결과 확인


-- =========================================================
-- 공통 범위 CTE
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
select
  start_kst_date,
  end_kst_date
from range_window;


-- =========================================================
-- PREVIEW 1: 최근 30일 fallback 포스트 개수 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
select
  count(*) as fallback_post_count_last_30_days
from posts
cross join range_window
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
  and ((published_at at time zone 'Asia/Seoul')::date)
      between range_window.start_kst_date and range_window.end_kst_date;


-- =========================================================
-- PREVIEW 2: 최근 30일 fallback 포스트 목록 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
select
  id,
  post_type,
  published_at,
  title,
  summary
from posts
cross join range_window
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
  and ((published_at at time zone 'Asia/Seoul')::date)
      between range_window.start_kst_date and range_window.end_kst_date
order by published_at desc;


-- =========================================================
-- PREVIEW 3: 최근 30일 중복 bucket 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
),
grouped as (
  select
    ((published_at at time zone 'Asia/Seoul')::date) as kst_date,
    post_type,
    count(*) as post_count,
    array_agg(id order by published_at desc, created_at desc) as post_ids
  from posts
  cross join range_window
  where ((published_at at time zone 'Asia/Seoul')::date)
        between range_window.start_kst_date and range_window.end_kst_date
  group by 1, 2
)
select
  kst_date,
  post_type,
  post_count,
  post_ids
from grouped
where post_count > 1
order by kst_date desc, post_type;


-- =========================================================
-- PREVIEW 4: 최근 30일 실제 중복 삭제 후보 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
),
ranked_posts as (
  select
    id,
    title,
    summary,
    post_type,
    published_at,
    created_at,
    updated_at,
    ((published_at at time zone 'Asia/Seoul')::date) as kst_date,
    row_number() over (
      partition by ((published_at at time zone 'Asia/Seoul')::date), post_type
      order by published_at desc, created_at desc, updated_at desc
    ) as rn
  from posts
  cross join range_window
  where ((published_at at time zone 'Asia/Seoul')::date)
        between range_window.start_kst_date and range_window.end_kst_date
)
select
  id,
  kst_date,
  post_type,
  published_at,
  title,
  summary,
  rn
from ranked_posts
where rn > 1
order by kst_date desc, post_type, rn;


-- =========================================================
-- OPTIONAL BACKUP TABLE
-- =========================================================

create table if not exists posts_cleanup_backup (
  backup_id bigint generated always as identity primary key,
  backup_batch text not null,
  cleanup_reason text not null,
  original_post_id uuid not null,
  backed_up_at timestamptz not null default now(),
  post_data jsonb not null
);

create index if not exists idx_posts_cleanup_backup_batch
  on posts_cleanup_backup (backup_batch, cleanup_reason);


-- =========================================================
-- BACKUP 1: 최근 30일 fallback 포스트 백업
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
insert into posts_cleanup_backup (backup_batch, cleanup_reason, original_post_id, post_data)
select
  'replace-with-your-batch-name',
  'fallback-summary-last-30-days',
  posts.id,
  to_jsonb(posts)
from posts
cross join range_window
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
  and ((published_at at time zone 'Asia/Seoul')::date)
      between range_window.start_kst_date and range_window.end_kst_date
  and not exists (
    select 1
    from posts_cleanup_backup backup
    where backup.original_post_id = posts.id
      and backup.cleanup_reason = 'fallback-summary-last-30-days'
  );


-- =========================================================
-- BACKUP 2: 최근 30일 duplicate 포스트 백업
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
),
ranked_posts as (
  select
    id,
    row_number() over (
      partition by ((published_at at time zone 'Asia/Seoul')::date), post_type
      order by published_at desc, created_at desc, updated_at desc
    ) as rn
  from posts
  cross join range_window
  where ((published_at at time zone 'Asia/Seoul')::date)
        between range_window.start_kst_date and range_window.end_kst_date
)
insert into posts_cleanup_backup (backup_batch, cleanup_reason, original_post_id, post_data)
select
  'replace-with-your-batch-name',
  'duplicate-slot-last-30-days',
  posts.id,
  to_jsonb(posts)
from posts
join ranked_posts on ranked_posts.id = posts.id
where ranked_posts.rn > 1
  and not exists (
    select 1
    from posts_cleanup_backup backup
    where backup.original_post_id = posts.id
      and backup.cleanup_reason = 'duplicate-slot-last-30-days'
  );


-- =========================================================
-- DELETE 1: 최근 30일 fallback 포스트 삭제
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
delete from posts
using range_window
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
  and ((published_at at time zone 'Asia/Seoul')::date)
      between range_window.start_kst_date and range_window.end_kst_date;


-- =========================================================
-- DELETE 2: 최근 30일 duplicate 포스트 삭제
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
),
ranked_posts as (
  select
    id,
    row_number() over (
      partition by ((published_at at time zone 'Asia/Seoul')::date), post_type
      order by published_at desc, created_at desc, updated_at desc
    ) as rn
  from posts
  cross join range_window
  where ((published_at at time zone 'Asia/Seoul')::date)
        between range_window.start_kst_date and range_window.end_kst_date
)
delete from posts
where id in (
  select id
  from ranked_posts
  where rn > 1
);


-- =========================================================
-- VERIFY 1: 최근 30일 남은 fallback 개수 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
select
  count(*) as remaining_fallback_post_count_last_30_days
from posts
cross join range_window
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
  and ((published_at at time zone 'Asia/Seoul')::date)
      between range_window.start_kst_date and range_window.end_kst_date;


-- =========================================================
-- VERIFY 2: 최근 30일 남은 duplicate bucket 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
),
grouped as (
  select
    ((published_at at time zone 'Asia/Seoul')::date) as kst_date,
    post_type,
    count(*) as post_count
  from posts
  cross join range_window
  where ((published_at at time zone 'Asia/Seoul')::date)
        between range_window.start_kst_date and range_window.end_kst_date
  group by 1, 2
)
select
  kst_date,
  post_type,
  post_count
from grouped
where post_count > 1
order by kst_date desc, post_type;


-- =========================================================
-- VERIFY 3: 최근 30일 발행 상태 확인
-- =========================================================

with range_window as (
  select
    ((now() at time zone 'Asia/Seoul')::date - 29) as start_kst_date,
    (now() at time zone 'Asia/Seoul')::date as end_kst_date
)
select
  id,
  post_type,
  published_at,
  title,
  summary
from posts
cross join range_window
where ((published_at at time zone 'Asia/Seoul')::date)
      between range_window.start_kst_date and range_window.end_kst_date
order by published_at desc;
