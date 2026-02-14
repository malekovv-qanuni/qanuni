-- ============================================================================
-- Qanuni SaaS - Lawyers Table Schema
-- Version: 1.0.0 (Week 2 Day 6)
--
-- Standalone file - safe to run independently without affecting firms/users
-- ============================================================================

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.lawyers', 'U') IS NOT NULL
  DROP TABLE dbo.lawyers;
GO

-- ============================================================================
-- LAWYERS TABLE
-- ============================================================================
CREATE TABLE lawyers (
  lawyer_id             INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,

  -- Personal information
  full_name             NVARCHAR(200)   NOT NULL,
  full_name_arabic      NVARCHAR(200),
  email                 NVARCHAR(255),
  phone                 NVARCHAR(50),
  mobile                NVARCHAR(50),

  -- Role and billing
  role                  NVARCHAR(50)    DEFAULT 'associate',  -- partner, senior_associate, associate, paralegal, clerk, of_counsel
  hourly_rate           DECIMAL(10,2),
  hourly_rate_currency  NVARCHAR(10)    DEFAULT 'USD',

  -- Employment
  hire_date             DATE,
  is_active             BIT             NOT NULL DEFAULT 1,

  -- User linkage (optional - if lawyer has system access)
  user_id               INT,

  -- Notes
  notes                 NVARCHAR(MAX),

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_lawyers_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_lawyers_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT FK_lawyers_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IX_lawyers_firm ON lawyers(firm_id);
CREATE INDEX IX_lawyers_active ON lawyers(firm_id, is_active) WHERE is_deleted = 0;
CREATE INDEX IX_lawyers_role ON lawyers(firm_id, role) WHERE is_deleted = 0;
GO

-- Filtered unique index: allows multiple NULLs, enforces uniqueness on non-null emails within firm
CREATE UNIQUE INDEX UQ_lawyer_email
  ON lawyers(firm_id, email)
  WHERE email IS NOT NULL AND is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'lawyers' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lawyers';

PRINT '=== Qanuni SaaS lawyers table created successfully ===';
