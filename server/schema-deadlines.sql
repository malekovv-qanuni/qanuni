-- ============================================================================
-- Qanuni SaaS - Deadlines Table Schema
-- Version: 1.0.0 (Week 3 Day 13)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, matters, judgments
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.deadlines', 'U') IS NOT NULL
  DROP TABLE dbo.deadlines;
GO

-- ============================================================================
-- DEADLINES TABLE
-- ============================================================================
CREATE TABLE deadlines (
  deadline_id           INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  matter_id             INT             NOT NULL,
  judgment_id           INT,

  -- Deadline details
  title                 NVARCHAR(500)   NOT NULL,
  deadline_date         DATE            NOT NULL,
  reminder_days         INT             NOT NULL DEFAULT 7,
  priority              NVARCHAR(20)    NOT NULL DEFAULT 'medium',
  status                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
  notes                 NVARCHAR(MAX),

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_deadlines_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_deadlines_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_deadlines_judgment FOREIGN KEY (judgment_id) REFERENCES judgments(judgment_id),
  CONSTRAINT FK_deadlines_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_deadlines_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT CHK_deadlines_status CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled'))
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_deadlines_firm_status ON deadlines(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_deadlines_matter ON deadlines(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_deadlines_date ON deadlines(deadline_date) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'deadlines' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deadlines';
GO

PRINT '=== Qanuni SaaS deadlines table created successfully ===';
GO
