-- ============================================================================
-- Qanuni SaaS - Advances Table Schema
-- Version: 1.0.0 (Week 3 Day 16)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, clients, matters, lawyers
--
-- Supports 3 advance categories:
--   1. Client advances (client_retainer, client_expense_advance)
--      - Require client_id, optional matter_id
--      - Track balance_remaining
--   2. Lawyer advances (lawyer_advance)
--      - Require lawyer_id, no client_id/matter_id
--      - Track balance_remaining
--   3. Fee payments (fee_payment_initial, fee_payment_interim, fee_payment_final)
--      - Require client_id and matter_id
--      - No balance tracking (one-time payments)
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.advances', 'U') IS NOT NULL
  DROP TABLE dbo.advances;
GO

-- ============================================================================
-- ADVANCES TABLE
-- ============================================================================
CREATE TABLE advances (
  advance_id            INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,

  -- Multi-entity links (nullable - depends on advance_type)
  client_id             INT,
  matter_id             INT,
  lawyer_id             INT,

  -- Advance details
  advance_type          NVARCHAR(50)    NOT NULL DEFAULT 'client_retainer',
  amount                DECIMAL(15,2)   NOT NULL,
  currency              NVARCHAR(3)     NOT NULL DEFAULT 'USD',
  date_received         DATE            NOT NULL,
  payment_method        NVARCHAR(50)    NOT NULL DEFAULT 'bank_transfer',
  reference_number      NVARCHAR(100),

  -- Balance tracking (NULL for fee_payment types)
  balance_remaining     DECIMAL(15,2),
  minimum_balance_alert DECIMAL(15,2),

  -- Fee payment fields
  fee_description       NVARCHAR(500),

  -- General
  notes                 NVARCHAR(MAX),
  status                NVARCHAR(20)    NOT NULL DEFAULT 'active',

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_advances_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_advances_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT FK_advances_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_advances_lawyer FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id),
  CONSTRAINT FK_advances_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_advances_type CHECK (advance_type IN (
    'client_expense_advance', 'client_retainer', 'lawyer_advance',
    'fee_payment_initial', 'fee_payment_interim', 'fee_payment_final'
  )),
  CONSTRAINT CHK_advances_status CHECK (status IN ('active', 'depleted', 'refunded')),
  CONSTRAINT CHK_advances_amount CHECK (amount > 0),

  -- Business rule: lawyer_advance requires lawyer_id, no client_id/matter_id
  -- Non-lawyer types require client_id
  CONSTRAINT CHK_advances_entity CHECK (
    (advance_type = 'lawyer_advance' AND lawyer_id IS NOT NULL AND client_id IS NULL AND matter_id IS NULL)
    OR
    (advance_type != 'lawyer_advance' AND lawyer_id IS NULL AND client_id IS NOT NULL)
  )
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_advances_firm_status ON advances(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_advances_client ON advances(client_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_advances_matter ON advances(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_advances_lawyer ON advances(lawyer_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_advances_date ON advances(date_received) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'advances' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'advances';
GO

PRINT '=== Qanuni SaaS advances table created successfully ===';
GO
