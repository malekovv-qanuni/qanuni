-- ============================================================================
-- Qanuni SaaS - Judgments Table Schema
-- Version: 1.0.0 (Week 3 Day 12)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, matters, hearings
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.judgments', 'U') IS NOT NULL
  DROP TABLE dbo.judgments;
GO

-- ============================================================================
-- JUDGMENTS TABLE
-- ============================================================================
CREATE TABLE judgments (
  judgment_id           INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  matter_id             INT             NOT NULL,
  hearing_id            INT,

  -- Judgment details
  judgment_type         NVARCHAR(50)    NOT NULL DEFAULT 'first_instance',
  expected_date         DATE,
  actual_date           DATE,
  reminder_days         INT             NOT NULL DEFAULT 7,
  judgment_outcome      NVARCHAR(500),
  judgment_summary      NVARCHAR(MAX),

  -- Financial
  amount_awarded        DECIMAL(18,2),
  currency              NVARCHAR(10)    NOT NULL DEFAULT 'USD',
  in_favor_of           NVARCHAR(500),

  -- Appeal
  appeal_deadline       DATE,

  -- Status
  status                NVARCHAR(50)    NOT NULL DEFAULT 'pending',
  notes                 NVARCHAR(MAX),

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_judgments_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_judgments_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_judgments_hearing FOREIGN KEY (hearing_id) REFERENCES hearings(hearing_id),
  CONSTRAINT FK_judgments_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_judgments_type CHECK (judgment_type IN ('first_instance', 'appeal', 'cassation', 'arbitration')),
  CONSTRAINT CHK_judgments_status CHECK (status IN ('pending', 'favorable', 'unfavorable', 'partial', 'dismissed', 'settled', 'appealed', 'moved_to_hearing'))
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_judgments_firm_status ON judgments(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_judgments_matter ON judgments(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_judgments_expected_date ON judgments(expected_date) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'judgments' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'judgments';
GO

PRINT '=== Qanuni SaaS judgments table created successfully ===';
GO
