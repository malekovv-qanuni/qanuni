-- ============================================================================
-- Qanuni SaaS - Expenses Table Schema
-- Version: 1.0.0 (Week 3 Day 15)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, matters, lawyers
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.expenses', 'U') IS NOT NULL
  DROP TABLE dbo.expenses;
GO

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE TABLE expenses (
  expense_id            INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  matter_id             INT,
  lawyer_id             INT,

  -- Expense details
  expense_type          NVARCHAR(20)    NOT NULL DEFAULT 'client',
  date                  DATE            NOT NULL,
  amount                DECIMAL(18,2)   NOT NULL,
  currency              NVARCHAR(10)    NOT NULL DEFAULT 'USD',
  description           NVARCHAR(1000)  NOT NULL,
  category              NVARCHAR(100),

  -- Billing
  billable              BIT             NOT NULL DEFAULT 1,
  markup_percent        DECIMAL(5,2)    NOT NULL DEFAULT 0,
  paid_by_firm          BIT             NOT NULL DEFAULT 0,
  paid_by_lawyer_id     INT,
  status                NVARCHAR(20)    NOT NULL DEFAULT 'pending',
  notes                 NVARCHAR(MAX),

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_expenses_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_expenses_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_expenses_lawyer FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id),
  CONSTRAINT FK_expenses_paid_by FOREIGN KEY (paid_by_lawyer_id) REFERENCES lawyers(lawyer_id),
  CONSTRAINT FK_expenses_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_expenses_type CHECK (expense_type IN ('client', 'firm', 'personal')),
  CONSTRAINT CHK_expenses_status CHECK (status IN ('pending', 'approved', 'reimbursed', 'billed', 'rejected')),
  CONSTRAINT CHK_expenses_amount CHECK (amount > 0),
  CONSTRAINT CHK_expenses_markup CHECK (markup_percent >= 0 AND markup_percent <= 100)
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_expenses_firm_status ON expenses(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_expenses_matter ON expenses(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_expenses_lawyer ON expenses(lawyer_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_expenses_date ON expenses(date) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'expenses' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'expenses';
GO

PRINT '=== Qanuni SaaS expenses table created successfully ===';
GO
