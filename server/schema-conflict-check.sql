-- ============================================================================
-- Qanuni SaaS - Conflict Check Log Table Schema
-- Version: 1.0.0 (Week 4 Day 19)
--
-- Standalone file - safe to run independently
-- Logs conflict check searches for audit trail
-- ============================================================================

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.conflict_check_log', 'U') IS NOT NULL
  DROP TABLE dbo.conflict_check_log;
GO

-- ============================================================================
-- CONFLICT CHECK LOG TABLE
-- ============================================================================
CREATE TABLE conflict_check_log (
  log_id              INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT             NOT NULL,
  search_terms        NVARCHAR(MAX)   NOT NULL,
  results_count       INT             NOT NULL DEFAULT 0,
  checked_by          INT             NOT NULL,
  checked_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_conflict_log_firms FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_conflict_log_users FOREIGN KEY (checked_by) REFERENCES users(user_id)
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_conflict_log_firm ON conflict_check_log(firm_id);
CREATE NONCLUSTERED INDEX IX_conflict_log_date ON conflict_check_log(checked_at);
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'conflict_check_log' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'conflict_check_log';

PRINT '=== Qanuni SaaS conflict_check_log table created successfully ===';
