-- Supabase에서 실행할 SQL 스키마

-- posts 테이블 생성
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('morning', 'noon', 'evening')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('news', 'stock', 'mixed')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

-- 서비스 역할만 삽입/수정/삭제 가능
CREATE POLICY "Service role can insert posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update posts" ON posts
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete posts" ON posts
  FOR DELETE USING (auth.role() = 'service_role');
