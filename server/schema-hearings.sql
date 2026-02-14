-- ============================================================================
-- Qanuni SaaS - Hearings Table Schema
-- Version: 1.0.0 (Week 2 Day 7)
--
-- Standalone file - safe to run independently (requires firms, users, matters)
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.hearings', 'U') IS NOT NULL
  DROP TABLE dbo.hearings;
GO

-- ============================================================================
-- HEARINGS TABLE
-- ============================================================================
CREATE TABLE hearings (
  hearing_id            INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  matter_id             INT             NOT NULL,

  -- Scheduling
  hearing_date          DATE            NOT NULL,
  hearing_time          TIME,
  hearing_type          NVARCHAR(50),                    -- initial, status, trial, sentencing, appeal, other

  -- Court details
  court_name            NVARCHAR(200),
  court_room            NVARCHAR(50),
  judge_name            NVARCHAR(200),

  -- Outcome
  outcome               NVARCHAR(50)    DEFAULT 'pending', -- pending, continued, decided, settled, dismissed
  outcome_notes         NVARCHAR(MAX),

  -- Calendar
  next_hearing_date     DATE,
  reminder_days         INT             DEFAULT 7,         -- Days before to remind

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_hearings_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_hearings_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_hearings_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IX_hearings_firm ON hearings(firm_id);
CREATE INDEX IX_hearings_firm_date ON hearings(firm_id, hearing_date) WHERE is_deleted = 0;
CREATE INDEX IX_hearings_matter ON hearings(matter_id) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'hearings' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hearings';

PRINT '=== Qanuni SaaS hearings table created successfully ===';
