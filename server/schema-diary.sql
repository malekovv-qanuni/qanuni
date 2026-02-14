-- ============================================================================
-- Qanuni SaaS - Diary Table Schema
-- Version: 1.0.0 (Week 3 Day 10)
--
-- Standalone file - safe to run independently (requires firms, users, matters)
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.diary', 'U') IS NOT NULL
  DROP TABLE dbo.diary;
GO

-- ============================================================================
-- DIARY TABLE
-- ============================================================================
CREATE TABLE diary (
  diary_id              INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  matter_id             INT             NOT NULL,

  -- Entry details
  entry_date            DATE            NOT NULL,
  entry_type            NVARCHAR(50)    NOT NULL DEFAULT 'note',
  title                 NVARCHAR(500)   NOT NULL,
  description           NVARCHAR(MAX),

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_diary_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_diary_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_diary_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT CHK_diary_entry_type CHECK (entry_type IN ('note', 'call', 'meeting', 'correspondence', 'filing', 'research', 'other'))
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IX_diary_firm ON diary(firm_id);
CREATE INDEX IX_diary_firm_date ON diary(firm_id, entry_date DESC) WHERE is_deleted = 0;
CREATE INDEX IX_diary_matter ON diary(matter_id) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'diary' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'diary';

PRINT '=== Qanuni SaaS diary table created successfully ===';
