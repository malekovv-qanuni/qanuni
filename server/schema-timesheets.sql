-- ============================================================================
-- Qanuni SaaS - Timesheets Table Schema
-- Version: 1.0.0 (Week 3 Day 14)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, matters, lawyers
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.timesheets', 'U') IS NOT NULL
  DROP TABLE dbo.timesheets;
GO

-- ============================================================================
-- TIMESHEETS TABLE
-- ============================================================================
CREATE TABLE timesheets (
  timesheet_id          INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  matter_id             INT,
  lawyer_id             INT,

  -- Time entry details
  entry_date            DATE            NOT NULL,
  minutes               INT             NOT NULL,
  narrative             NVARCHAR(MAX)   NOT NULL,
  billable              BIT             NOT NULL DEFAULT 1,

  -- Rate / billing
  rate_per_hour         DECIMAL(18,2),
  rate_currency         NVARCHAR(10)    NOT NULL DEFAULT 'USD',
  status                NVARCHAR(20)    NOT NULL DEFAULT 'draft',

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_timesheets_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_timesheets_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_timesheets_lawyer FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id),
  CONSTRAINT FK_timesheets_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_timesheets_status CHECK (status IN ('draft', 'submitted', 'approved', 'billed')),
  CONSTRAINT CHK_timesheets_minutes CHECK (minutes >= 1 AND minutes <= 1440)
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_timesheets_firm_status ON timesheets(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_timesheets_matter ON timesheets(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_timesheets_lawyer ON timesheets(lawyer_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_timesheets_date ON timesheets(entry_date) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'timesheets' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timesheets';
GO

PRINT '=== Qanuni SaaS timesheets table created successfully ===';
GO
