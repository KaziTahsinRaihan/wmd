-- =====================================================================
-- Wise Man's Doctrine — MySQL schema
-- Run order matters: parents before children (FKs).
-- =====================================================================
SET NAMES utf8mb4;

-- ---------- Identity & platform ----------

CREATE TABLE users (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(190)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('student','instructor','admin') NOT NULL DEFAULT 'student',
  status          ENUM('active','pending','suspended') NOT NULL DEFAULT 'active',
  phone           VARCHAR(30)   NULL,
  gender          ENUM('male','female') NULL,          -- required for students (voice rooms)
  target_month    VARCHAR(12)   NULL,
  target_year     SMALLINT UNSIGNED NULL,
  target_score    DECIMAL(2,1)  NULL,                  -- 5.0–9.0 in 0.5 steps
  target_country  VARCHAR(80)   NULL,
  onboarded       TINYINT(1)    NOT NULL DEFAULT 0,
  avatar_file_id  INT UNSIGNED  NULL,
  cohort          VARCHAR(80)   NULL,                  -- admin console field
  specialty       VARCHAR(120)  NULL,                  -- instructors
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_tokens (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL,                   -- sha256 of the token
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token (token_hash),
  KEY idx_tokens_user (user_id),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  setting_key   VARCHAR(60)  NOT NULL,                 -- 'site_name','default_band','allow_signup'
  setting_value VARCHAR(255) NOT NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE files (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uploader_id  INT UNSIGNED NULL,
  stored_path  VARCHAR(255) NOT NULL,                  -- e.g. uploads/2026/09/abc123.webm
  original_name VARCHAR(190) NULL,
  mime_type    VARCHAR(120) NOT NULL,
  size_bytes   INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_files_uploader (uploader_id),
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD CONSTRAINT fk_users_avatar FOREIGN KEY (avatar_file_id) REFERENCES files(id) ON DELETE SET NULL;

-- ---------- Courses & learning ----------

CREATE TABLE courses (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(120) NOT NULL,
  title           VARCHAR(190) NOT NULL,
  exam            ENUM('ielts','pte','toefl','duolingo','general') NOT NULL DEFAULT 'ielts',
  format          ENUM('online','live','hybrid') NOT NULL DEFAULT 'online',
  level           ENUM('Beginner','Intermediate','Advanced','All Levels') NOT NULL DEFAULT 'All Levels',
  tagline         VARCHAR(255) NULL,
  description     TEXT NULL,
  duration_weeks  TINYINT UNSIGNED NOT NULL DEFAULT 8,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price  DECIMAL(10,2) NOT NULL DEFAULT 10000,
  currency        CHAR(3) NOT NULL DEFAULT 'BDT',
  start_date      DATE NULL,
  features_json   JSON NULL,                           -- marketing bullet list
  published       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_instructors (
  course_id INT UNSIGNED NOT NULL,
  user_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (course_id, user_id),
  KEY idx_ci_user (user_id),
  CONSTRAINT fk_ci_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_modules (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id  INT UNSIGNED NOT NULL,
  title      VARCHAR(190) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_modules_course (course_id, sort_order),
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_lessons (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_id     INT UNSIGNED NOT NULL,
  title         VARCHAR(190) NOT NULL,
  video_url     VARCHAR(500) NULL,                     -- per-lesson video (replaces shared demo)
  captions_url  VARCHAR(500) NULL,
  duration_sec  INT UNSIGNED NULL,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_lessons_module (module_id, sort_order),
  CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_schedule_slots (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id  INT UNSIGNED NOT NULL,
  day_of_week VARCHAR(12) NOT NULL,                    -- 'Saturday' …
  time_label VARCHAR(40)  NOT NULL,                    -- '8:00 PM'
  PRIMARY KEY (id),
  KEY idx_slots_course (course_id),
  CONSTRAINT fk_slots_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  course_id      INT UNSIGNED NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  currency       CHAR(3) NOT NULL DEFAULT 'BDT',
  method         VARCHAR(40) NULL,                     -- 'bkash','sslcommerz','manual'…
  transaction_ref VARCHAR(190) NULL,
  status         ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at        DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_payments_user (user_id),
  KEY idx_payments_course (course_id),
  CONSTRAINT fk_payments_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_payments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE enrollments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  course_id   INT UNSIGNED NOT NULL,
  payment_id  INT UNSIGNED NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enroll (user_id, course_id),
  KEY idx_enroll_course (course_id),
  CONSTRAINT fk_enroll_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_enroll_course  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE,
  CONSTRAINT fk_enroll_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson_progress (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  lesson_id     INT UNSIGNED NOT NULL,
  watched_sec   INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_progress (user_id, lesson_id),
  KEY idx_progress_lesson (lesson_id),
  CONSTRAINT fk_progress_user   FOREIGN KEY (user_id)   REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE announcements (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id  INT UNSIGNED NOT NULL,
  author_id  INT UNSIGNED NULL,
  message    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ann_course (course_id, created_at),
  CONSTRAINT fk_ann_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_ann_author FOREIGN KEY (author_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id  INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at  DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_comments_lesson (lesson_id, created_at),
  CONSTRAINT fk_comments_lesson FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user   FOREIGN KEY (user_id)   REFERENCES users(id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE live_classes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id     INT UNSIGNED NOT NULL,
  instructor_id INT UNSIGNED NULL,
  title         VARCHAR(190) NOT NULL,
  cohort        VARCHAR(80)  NULL,
  starts_at     DATETIME NOT NULL,
  duration_min  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  join_url      VARCHAR(500) NULL,                     -- Zoom/Jitsi/Daily link
  seats_total   SMALLINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_live_course (course_id, starts_at),
  KEY idx_live_instructor (instructor_id, starts_at),
  CONSTRAINT fk_live_course     FOREIGN KEY (course_id)     REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_live_instructor FOREIGN KEY (instructor_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE availability_slots (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  instructor_id INT UNSIGNED NOT NULL,
  slot_date     DATE NOT NULL,
  slot_time     TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot (instructor_id, slot_date, slot_time),
  CONSTRAINT fk_avail_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slot_id    INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  status     ENUM('booked','completed','cancelled') NOT NULL DEFAULT 'booked',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_slot (slot_id),                -- one booking per slot
  KEY idx_booking_student (student_id),
  CONSTRAINT fk_booking_slot    FOREIGN KEY (slot_id)    REFERENCES availability_slots(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_student FOREIGN KEY (student_id) REFERENCES users(id)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Question bank & attempts ----------

CREATE TABLE question_folders (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id  INT UNSIGNED NULL,
  module     ENUM('listening','reading','writing','speaking') NOT NULL,
  name       VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_folders_parent (parent_id),
  CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id) REFERENCES question_folders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE questions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id      INT UNSIGNED NULL,
  folder_id      INT UNSIGNED NULL,
  module         ENUM('listening','reading','writing','speaking') NOT NULL,
  name           VARCHAR(190) NOT NULL DEFAULT 'Untitled question',
  status         ENUM('draft','published') NOT NULL DEFAULT 'draft',
  start_number   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  writing_format ENUM('computer','paper') NULL,
  audio_file_id  INT UNSIGNED NULL,                    -- listening audio
  payload        JSON NOT NULL,                        -- full AuthoredTest (groups, passages, HTML)
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_q_module_status (module, status),
  KEY idx_q_author (author_id),
  CONSTRAINT fk_q_author FOREIGN KEY (author_id)     REFERENCES users(id)            ON DELETE SET NULL,
  CONSTRAINT fk_q_folder FOREIGN KEY (folder_id)     REFERENCES question_folders(id) ON DELETE SET NULL,
  CONSTRAINT fk_q_audio  FOREIGN KEY (audio_file_id) REFERENCES files(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE answer_keys (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id     INT UNSIGNED NOT NULL,
  question_number SMALLINT UNSIGNED NOT NULL,          -- 1..40
  alternative     VARCHAR(190) NOT NULL,               -- one accepted answer variant
  PRIMARY KEY (id),
  UNIQUE KEY uq_key (question_id, question_number, alternative),
  CONSTRAINT fk_key_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id  INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  module       ENUM('listening','reading','writing','speaking') NOT NULL,
  status       ENUM('submitted','graded') NOT NULL DEFAULT 'submitted',
  answers      JSON NULL,                              -- {answers:{}, multi:{}} for L/R
  raw_score    SMALLINT UNSIGNED NULL,                 -- correct count (L/R, server-scored)
  total        SMALLINT UNSIGNED NULL,                 -- usually 40
  band         DECIMAL(2,1) NULL,                      -- set by scoring (L/R) or grading (W/S)
  started_at   DATETIME NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attempt (question_id, user_id),        -- resubmit overwrites (current behavior)
  KEY idx_attempts_user (user_id, submitted_at),
  KEY idx_attempts_module (module, status),
  CONSTRAINT fk_attempt_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attempt_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_drafts (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  module      ENUM('listening','reading','writing','speaking') NOT NULL,
  answers     JSON NOT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_draft (question_id, user_id),
  CONSTRAINT fk_draft_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_draft_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_recordings (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id    INT UNSIGNED NOT NULL,
  part          TINYINT UNSIGNED NOT NULL,             -- 1 | 2 | 3
  task_number   SMALLINT UNSIGNED NOT NULL,
  question_text TEXT NULL,
  duration_sec  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  mime_type     VARCHAR(80) NOT NULL DEFAULT 'audio/webm',
  file_id       INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_rec_attempt (attempt_id),
  CONSTRAINT fk_rec_attempt FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_file    FOREIGN KEY (file_id)    REFERENCES files(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE writing_task_answers (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id    INT UNSIGNED NOT NULL,
  task_number   TINYINT UNSIGNED NOT NULL,             -- 1 | 2
  body          MEDIUMTEXT NULL,                       -- computer mode essay text
  word_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  image_file_id INT UNSIGNED NULL,                     -- paper mode photo upload
  PRIMARY KEY (id),
  UNIQUE KEY uq_wta (attempt_id, task_number),
  CONSTRAINT fk_wta_attempt FOREIGN KEY (attempt_id)    REFERENCES attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_wta_image   FOREIGN KEY (image_file_id) REFERENCES files(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Grading & feedback ----------

CREATE TABLE writing_evaluations (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id     INT UNSIGNED NOT NULL,
  evaluator_id   INT UNSIGNED NULL,
  status         ENUM('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
  task1_band     DECIMAL(2,1) NULL,
  task2_band     DECIMAL(2,1) NULL,
  module_band    DECIMAL(2,1) NULL,                    -- round((t1 + 2*t2)/3)
  overall_comment TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at   DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_weval_attempt (attempt_id),            -- one evaluation per attempt
  KEY idx_weval_evaluator (evaluator_id),
  CONSTRAINT fk_weval_attempt   FOREIGN KEY (attempt_id)   REFERENCES attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_weval_evaluator FOREIGN KEY (evaluator_id) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE writing_task_evaluations (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluation_id INT UNSIGNED NOT NULL,
  task_number   TINYINT UNSIGNED NOT NULL,             -- 1 | 2
  tr_score      TINYINT UNSIGNED NOT NULL DEFAULT 6,   -- Task Response 0–9
  cc_score      TINYINT UNSIGNED NOT NULL DEFAULT 6,   -- Coherence & Cohesion
  lr_score      TINYINT UNSIGNED NOT NULL DEFAULT 6,   -- Lexical Resource
  gra_score     TINYINT UNSIGNED NOT NULL DEFAULT 6,   -- Grammatical Range & Accuracy
  tr_feedback   TEXT NULL,
  cc_feedback   TEXT NULL,
  lr_feedback   TEXT NULL,
  gra_feedback  TEXT NULL,
  annotations   JSON NULL,                             -- pen/highlight/arrow/circle/text drawings
  PRIMARY KEY (id),
  UNIQUE KEY uq_wte (evaluation_id, task_number),
  CONSTRAINT fk_wte_eval FOREIGN KEY (evaluation_id) REFERENCES writing_evaluations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE speaking_evaluations (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id      INT UNSIGNED NOT NULL,
  evaluator_id    INT UNSIGNED NULL,
  status          ENUM('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
  fc_score        TINYINT UNSIGNED NOT NULL DEFAULT 6, -- Fluency & Coherence
  lr_score        TINYINT UNSIGNED NOT NULL DEFAULT 6, -- Lexical Resource
  gra_score       TINYINT UNSIGNED NOT NULL DEFAULT 6, -- Grammatical Range & Accuracy
  pron_score      TINYINT UNSIGNED NOT NULL DEFAULT 6, -- Pronunciation
  fc_feedback     TEXT NULL,
  lr_feedback     TEXT NULL,
  gra_feedback    TEXT NULL,
  pron_feedback   TEXT NULL,
  overall_comment TEXT NULL,
  overall_band    DECIMAL(2,1) NULL,                   -- round(mean of 4)
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seval_attempt (attempt_id),
  KEY idx_seval_evaluator (evaluator_id),
  CONSTRAINT fk_seval_attempt   FOREIGN KEY (attempt_id)   REFERENCES attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_seval_evaluator FOREIGN KEY (evaluator_id) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Full mocks, gamification & community ----------

CREATE TABLE full_mocks (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number       TINYINT UNSIGNED NOT NULL,              -- 1..20
  title        VARCHAR(190) NOT NULL,
  exam         ENUM('Academic','General Training','Mixed') NOT NULL DEFAULT 'Academic',
  tier         ENUM('Foundation','Intermediate','Advanced','Recent') NOT NULL DEFAULT 'Foundation',
  duration_min SMALLINT UNSIGNED NOT NULL DEFAULT 165,
  blurb        VARCHAR(255) NULL,
  unlocked     TINYINT(1) NOT NULL DEFAULT 0,          -- first 5 = 1
  PRIMARY KEY (id),
  UNIQUE KEY uq_mock_number (number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mock_results (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id  INT UNSIGNED NOT NULL,
  mock_id  INT UNSIGNED NOT NULL,
  band     DECIMAL(2,1) NOT NULL,
  taken_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mock_result (user_id, mock_id),
  KEY idx_mockres_band (band),
  CONSTRAINT fk_mockres_user FOREIGN KEY (user_id) REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_mockres_mock FOREIGN KEY (mock_id) REFERENCES full_mocks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE streaks (
  user_id    INT UNSIGNED NOT NULL,
  current    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  longest    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_visit DATE NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_streak_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE badges (
  band        DECIMAL(2,1) NOT NULL,                   -- 1.0 .. 9.0 step 0.5 (17 rows)
  name        VARCHAR(120) NOT NULL,                   -- 'Archmage', 'Spellmaster', …
  description VARCHAR(255) NULL,
  PRIMARY KEY (band)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_badges_seen (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  module_key ENUM('overall','listening','reading','writing','speaking') NOT NULL,
  band       DECIMAL(2,1) NOT NULL,                    -- highest celebrated tier
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_badge_seen (user_id, module_key),
  CONSTRAINT fk_badge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_messages (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  body       VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,                            -- soft delete for moderation audit
  PRIMARY KEY (id),
  KEY idx_chat_created (created_at),
  CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE voice_rooms (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(80) NOT NULL,                       -- 'Roundtable 1' …
  gender   ENUM('male','female') NOT NULL,
  capacity TINYINT UNSIGNED NOT NULL DEFAULT 6,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE voice_presence (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id   INT UNSIGNED NOT NULL,
  user_id   INT UNSIGNED NOT NULL,
  muted     TINYINT(1) NOT NULL DEFAULT 1,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_presence_user (user_id),               -- one room per user
  KEY idx_presence_room (room_id),
  CONSTRAINT fk_presence_room FOREIGN KEY (room_id) REFERENCES voice_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_presence_user FOREIGN KEY (user_id) REFERENCES users(id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_chat_messages (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  sender     ENUM('user','ai') NOT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_user (user_id, created_at),
  CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE practice_recordings (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  exam_title   VARCHAR(190) NULL,
  duration_sec SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  mime_type    VARCHAR(80) NOT NULL DEFAULT 'audio/webm',
  file_id      INT UNSIGNED NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prec_user (user_id, created_at),
  CONSTRAINT fk_prec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_prec_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Seed data ----------

INSERT INTO settings (setting_key, setting_value) VALUES
  ('site_name', 'Wise Man''s Doctrine'),
  ('default_band', '7'),
  ('allow_signup', '1');

INSERT INTO voice_rooms (name, gender, capacity) VALUES
  ('Roundtable 1', 'male', 6), ('Roundtable 2', 'male', 6), ('Roundtable 3', 'male', 6),
  ('Roundtable 1', 'female', 6), ('Roundtable 2', 'female', 6), ('Roundtable 3', 'female', 6);

INSERT INTO badges (band, name) VALUES
  (1.0,'The Awakening Novice'), (1.5,'Spellbound Apprentice'), (2.0,'Incantation Initiate'),
  (2.5,'Charm Weaver'), (3.0,'Acolyte of the Elements'), (3.5,'Rune Scholar'),
  (4.0,'Mystic Adept'), (4.5,'Alchemist of Words'), (5.0,'Grand Conjurer'),
  (5.5,'Arcane Specialist'), (6.0,'Spellmaster'), (6.5,'High Sorcerer'),
  (7.0,'Archmage'), (7.5,'Chronicler of Eldritch Lore'), (8.0,'Vanguard of the Mystic Order'),
  (8.5,'Keeper of the Eternal Grimoire'), (9.0,'Supreme Sovereign of the Arcane');
