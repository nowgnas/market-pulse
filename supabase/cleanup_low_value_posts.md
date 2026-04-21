# 오래된 저가치 포스트 정리 가이드

- 실행 파일: `supabase/cleanup_low_value_posts.sql`
- 최근 30일 전용 파일: `supabase/cleanup_low_value_posts_last_30_days.sql`
- 권장 실행 위치: Supabase SQL Editor
- 권장 순서: `PREVIEW` → `BACKUP` → `DELETE 1` → `DELETE 2` → `VERIFY`

주의사항
- `replace-with-your-batch-name` 문자열은 실행 전에 배치명으로 바꾸세요.
- 먼저 `DELETE 1`만 실행해서 fallback 글을 정리하고, 이후 `DELETE 2`로 중복 글을 정리하는 흐름을 권장합니다.
- 최근 7일치만 부분 정리하고 싶다면 각 쿼리에 날짜 조건을 추가해서 점진적으로 정리하세요.
- 안전하게 시작하려면 전체 정리본보다 `supabase/cleanup_low_value_posts_last_30_days.sql`부터 실행하는 것을 권장합니다.

추천 배치명 예시
- `2026-04-21-fallback-cleanup`
- `2026-04-21-duplicate-cleanup`
- `2026-04-21-last-30-days-cleanup`

정리 후 권장 작업
- 운영 환경의 `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ANTHROPIC_API_KEY` 상태 점검
- 수동으로 `/api/cron/generate-post` 1회 실행해서 정상 생성 확인
- 최근 7~14일치 핵심 글만 재생성해서 사이트 품질 신호 복구
