-- 오래된 저가치/중복 포스트 정리 스크립트
--
-- 권장 순서
-- 1) PREVIEW 섹션으로 삭제 대상을 먼저 확인
-- 2) BACKUP 섹션으로 삭제 대상을 백업
-- 3) DELETE FALLBACK POSTS 실행
-- 4) DELETE DUPLICATE POSTS 실행
-- 5) VERIFY 섹션으로 결과 확인
--
-- 기준
-- - fallback summary:
--   * 오늘의 시장 요약입니다.
--   * 주간 리뷰 콘텐츠입니다.
--   * 주간 전망 콘텐츠입니다.
-- - duplicate post:
--   * 같은 KST 날짜 + 같은 post_type 에서 최신 1건만 남기고 나머지 삭제


-- =========================================================
-- OPTIONAL: 날짜 범위 설정 예시
-- 필요하면 아래 CTE의 값을 바꿔서 각 쿼리에 붙여 사용하세요.
-- start_kst_date, end_kst_date 모두 NULL 이면 전체 기간 대상입니다.
-- =========================================================

-- with settings as (
--   select
--     null::date as start_kst_date,
--     null::date as end_kst_date
-- )
-- select * from settings;


-- =========================================================
-- PREVIEW 1: fallback 포스트 개수 확인
-- =========================================================

select
  count(*) as fallback_post_count
from posts
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
);


-- =========================================================
-- PREVIEW 2: fallback 포스트 목록 확인
-- =========================================================

select
  id,
  post_type,
  published_at,
  title,
  summary
from posts
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
order by published_at desc;


-- =========================================================
-- PREVIEW 3: 중복 bucket 확인
-- KST 기준 날짜별/타입별로 2건 이상인 그룹 조회
-- =========================================================

with grouped as (
  select
    ((published_at at time zone 'Asia/Seoul')::date) as kst_date,
    post_type,
    count(*) as post_count,
    array_agg(id order by published_at desc, created_at desc) as post_ids
  from posts
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
-- PREVIEW 4: 실제 중복 삭제 후보 확인
-- 최신 1건(rn = 1)만 남기고 rn > 1 을 삭제 후보로 봅니다.
-- =========================================================

with ranked_posts as (
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
-- 삭제 전에 백업해두고 싶으면 1회 실행하세요.
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
-- BACKUP 1: fallback 포스트 백업
-- backup_batch 값은 실행할 때 원하는 식별자로 바꿔주세요.
-- 예: '2026-04-21-fallback-cleanup'
-- =========================================================

insert into posts_cleanup_backup (backup_batch, cleanup_reason, original_post_id, post_data)
select
  'replace-with-your-batch-name',
  'fallback-summary',
  id,
  to_jsonb(posts)
from posts
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
)
  and not exists (
    select 1
    from posts_cleanup_backup backup
    where backup.original_post_id = posts.id
      and backup.cleanup_reason = 'fallback-summary'
  );


-- =========================================================
-- BACKUP 2: duplicate 포스트 백업
-- =========================================================

with ranked_posts as (
  select
    id,
    row_number() over (
      partition by ((published_at at time zone 'Asia/Seoul')::date), post_type
      order by published_at desc, created_at desc, updated_at desc
    ) as rn
  from posts
)
insert into posts_cleanup_backup (backup_batch, cleanup_reason, original_post_id, post_data)
select
  'replace-with-your-batch-name',
  'duplicate-slot',
  posts.id,
  to_jsonb(posts)
from posts
join ranked_posts on ranked_posts.id = posts.id
where ranked_posts.rn > 1
  and not exists (
    select 1
    from posts_cleanup_backup backup
    where backup.original_post_id = posts.id
      and backup.cleanup_reason = 'duplicate-slot'
  );


-- =========================================================
-- DELETE 1: fallback 포스트 삭제
-- 실제 삭제 전 반드시 PREVIEW/BACKUP 확인 권장
-- =========================================================

delete from posts
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
);


-- =========================================================
-- DELETE 2: duplicate 포스트 삭제
-- 최신 1건만 남기고 같은 KST 날짜 + post_type 의 나머지 삭제
-- fallback 삭제 후 실행 권장
-- =========================================================

with ranked_posts as (
  select
    id,
    row_number() over (
      partition by ((published_at at time zone 'Asia/Seoul')::date), post_type
      order by published_at desc, created_at desc, updated_at desc
    ) as rn
  from posts
)
delete from posts
where id in (
  select id
  from ranked_posts
  where rn > 1
);


-- =========================================================
-- VERIFY 1: 남은 fallback 개수 확인
-- =========================================================

select
  count(*) as remaining_fallback_post_count
from posts
where trim(summary) in (
  '오늘의 시장 요약입니다.',
  '주간 리뷰 콘텐츠입니다.',
  '주간 전망 콘텐츠입니다.'
);


-- =========================================================
-- VERIFY 2: 남은 duplicate bucket 확인
-- =========================================================

with grouped as (
  select
    ((published_at at time zone 'Asia/Seoul')::date) as kst_date,
    post_type,
    count(*) as post_count
  from posts
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
-- VERIFY 3: 최근 발행 상태 확인
-- =========================================================

select
  id,
  post_type,
  published_at,
  title,
  summary
from posts
order by published_at desc
limit 30;
