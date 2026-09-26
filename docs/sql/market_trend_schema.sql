-- EduRoute Skill Market Trend Engine (optional MySQL)
-- Apply only if MYSQL_* env is configured. JSON fallback works without DB.

CREATE TABLE IF NOT EXISTS mt_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  base_url VARCHAR(512) NULL,
  permitted TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mt_collection_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  source_code VARCHAR(64) NULL,
  jobs_fetched INT NOT NULL DEFAULT 0,
  jobs_inserted INT NOT NULL DEFAULT 0,
  jobs_duplicate INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mt_runs_started (started_at)
);

CREATE TABLE IF NOT EXISTS mt_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(191) NOT NULL,
  source_code VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL,
  company VARCHAR(256) NULL,
  location VARCHAR(256) NULL,
  experience VARCHAR(128) NULL,
  industry VARCHAR(128) NULL,
  salary_text VARCHAR(128) NULL,
  posting_date DATE NULL,
  collected_at DATETIME NOT NULL,
  raw_hash CHAR(64) NOT NULL,
  UNIQUE KEY uq_mt_jobs_source_ext (source_code, external_id),
  INDEX idx_mt_jobs_location (location),
  INDEX idx_mt_jobs_industry (industry),
  INDEX idx_mt_jobs_collected (collected_at)
);

CREATE TABLE IF NOT EXISTS mt_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  canonical VARCHAR(128) NOT NULL UNIQUE,
  category VARCHAR(64) NULL
);

CREATE TABLE IF NOT EXISTS mt_job_skills (
  job_id BIGINT NOT NULL,
  skill_id INT NOT NULL,
  PRIMARY KEY (job_id, skill_id),
  CONSTRAINT fk_mt_js_job FOREIGN KEY (job_id) REFERENCES mt_jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_mt_js_skill FOREIGN KEY (skill_id) REFERENCES mt_skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mt_skill_trends (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  skill_id INT NOT NULL,
  region VARCHAR(128) NOT NULL DEFAULT 'India (All)',
  role_filter VARCHAR(128) NULL,
  industry_filter VARCHAR(128) NULL,
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  job_count INT NOT NULL DEFAULT 0,
  demand_pct DECIMAL(6,2) NOT NULL DEFAULT 0,
  trend_label VARCHAR(32) NOT NULL DEFAULT 'stable',
  growth_pct DECIMAL(8,2) NULL,
  computed_at DATETIME NOT NULL,
  UNIQUE KEY uq_mt_trend (skill_id, region, window_start, window_end, role_filter, industry_filter),
  CONSTRAINT fk_mt_trend_skill FOREIGN KEY (skill_id) REFERENCES mt_skills(id) ON DELETE CASCADE
);
