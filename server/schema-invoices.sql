-- ============================================================================
-- Qanuni SaaS - Invoices & Invoice Items Table Schema
-- Version: 1.0.0 (Week 4 Day 17)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, clients, matters
--
-- Two tables:
--   1. invoices - Header with client-provided totals
--   2. invoice_items - Line items (1:many, CASCADE delete)
--
-- Invoice number: Auto-generated INV-YYYY-NNNN or user-provided custom
-- Totals: Client-provided (frontend calculates), server stores as-is
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop child table first (FK dependency)
IF OBJECT_ID('dbo.invoice_items', 'U') IS NOT NULL
  DROP TABLE dbo.invoice_items;
GO

IF OBJECT_ID('dbo.invoices', 'U') IS NOT NULL
  DROP TABLE dbo.invoices;
GO

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
  invoice_id            INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  client_id             INT             NOT NULL,
  matter_id             INT,

  -- Invoice identification
  invoice_number        NVARCHAR(50)    NOT NULL,
  invoice_content_type  NVARCHAR(20)    NOT NULL DEFAULT 'combined',

  -- Dates
  issue_date            DATE            NOT NULL,
  due_date              DATE,
  period_start          DATE,
  period_end            DATE,
  paid_date             DATE,

  -- Financial (client-provided totals)
  subtotal              DECIMAL(15,2)   NOT NULL DEFAULT 0,
  discount_type         NVARCHAR(20)    NOT NULL DEFAULT 'none',
  discount_value        DECIMAL(15,2)   NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(15,2)   NOT NULL DEFAULT 0,
  retainer_applied      DECIMAL(15,2)   NOT NULL DEFAULT 0,
  taxable_amount        DECIMAL(15,2)   NOT NULL DEFAULT 0,
  vat_rate              DECIMAL(5,2)    NOT NULL DEFAULT 0,
  vat_amount            DECIMAL(15,2)   NOT NULL DEFAULT 0,
  total                 DECIMAL(15,2)   NOT NULL DEFAULT 0,
  currency              NVARCHAR(3)     NOT NULL DEFAULT 'USD',

  -- Status & references
  status                NVARCHAR(20)    NOT NULL DEFAULT 'draft',
  client_reference      NVARCHAR(200),
  retainer_advance_id   INT,

  -- Notes
  notes_to_client       NVARCHAR(MAX),
  internal_notes        NVARCHAR(MAX),

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_invoices_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_invoices_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT FK_invoices_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_invoices_status CHECK (status IN (
    'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'written_off'
  )),
  CONSTRAINT CHK_invoices_discount_type CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  CONSTRAINT CHK_invoices_content_type CHECK (invoice_content_type IN ('combined', 'time_only', 'expense_only', 'separate'))
);
GO

-- ============================================================================
-- INVOICE ITEMS TABLE (1:many child)
-- ============================================================================
CREATE TABLE invoice_items (
  item_id               INT IDENTITY(1,1) PRIMARY KEY,
  invoice_id            INT             NOT NULL,
  firm_id               INT             NOT NULL,

  -- Item details
  item_type             NVARCHAR(20)    NOT NULL DEFAULT 'time',
  item_date             DATE,
  description           NVARCHAR(1000),
  quantity              DECIMAL(10,2),
  unit                  NVARCHAR(20)    DEFAULT 'hours',
  rate                  DECIMAL(15,2),
  amount                DECIMAL(15,2)   NOT NULL DEFAULT 0,

  -- Source linkage (optional - tracks which timesheet/expense generated this item)
  timesheet_id          INT,
  expense_id            INT,

  -- Display order
  sort_order            INT             NOT NULL DEFAULT 0,

  -- Metadata
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  CONSTRAINT FK_invoice_items_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),

  -- Enum constraint
  CONSTRAINT CHK_invoice_items_type CHECK (item_type IN ('time', 'expense', 'fixed_fee'))
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_invoices_firm_status ON invoices(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_invoices_client ON invoices(client_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_invoices_matter ON invoices(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_invoices_date ON invoices(issue_date) WHERE is_deleted = 0;
GO

CREATE UNIQUE NONCLUSTERED INDEX IX_invoices_number ON invoices(firm_id, invoice_number) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_invoice_items_invoice ON invoice_items(invoice_id);
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'invoices' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'invoices';
GO

SELECT 'invoice_items' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'invoice_items';
GO

PRINT '=== Qanuni SaaS invoices + invoice_items tables created successfully ===';
GO
