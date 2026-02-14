-- ============================================================================
-- Qanuni SaaS - Matters + Matter-Clients Tables Schema
-- Version: 1.0.0 (Week 2 Day 5)
--
-- Two tables:
--   1. matters         - Core matter/case information (firm-scoped)
--   2. matter_clients  - Junction table for many-to-many matter-client links
--
-- Standalone file - safe to run independently (requires firms, users, clients)
-- ============================================================================

-- Drop tables in correct order (junction first due to FK)
IF OBJECT_ID('dbo.matter_clients', 'U') IS NOT NULL
  DROP TABLE dbo.matter_clients;
GO

IF OBJECT_ID('dbo.matters', 'U') IS NOT NULL
  DROP TABLE dbo.matters;
GO

-- ============================================================================
-- MATTERS TABLE
-- ============================================================================
CREATE TABLE matters (
  matter_id             INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,

  -- Matter identification
  matter_number         NVARCHAR(50)    NOT NULL,        -- Firm's internal file number
  matter_name           NVARCHAR(500)   NOT NULL,
  matter_name_arabic    NVARCHAR(500),

  -- Classification
  matter_type           NVARCHAR(50),                    -- litigation, advisory, corporate, transactional, other
  matter_status         NVARCHAR(50)    DEFAULT 'active', -- active, pending, closed, archived

  -- Court information (for litigation matters)
  court_name            NVARCHAR(200),
  court_name_arabic     NVARCHAR(200),
  case_number           NVARCHAR(100),                   -- Court's case number
  case_year             INT,

  -- Financial
  hourly_rate           DECIMAL(10,2),                   -- Default billing rate for this matter
  flat_fee              DECIMAL(10,2),                   -- If flat fee arrangement
  billing_type          NVARCHAR(50),                    -- hourly, flat_fee, contingency, pro_bono

  -- Dates
  date_opened           DATE,
  date_closed           DATE,
  statute_of_limitations DATE,                           -- Critical deadline tracking

  -- Details
  description           NVARCHAR(MAX),
  notes                 NVARCHAR(MAX),

  -- Metadata
  is_active             BIT             NOT NULL DEFAULT 1,
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Constraints
  CONSTRAINT FK_matters_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_matters_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT UQ_matter_number UNIQUE (firm_id, matter_number)  -- Unique within firm
);
GO

-- ============================================================================
-- MATTER_CLIENTS JUNCTION TABLE
-- ============================================================================
CREATE TABLE matter_clients (
  matter_client_id      INT IDENTITY(1,1) PRIMARY KEY,
  matter_id             INT             NOT NULL,
  client_id             INT             NOT NULL,
  firm_id               INT             NOT NULL,        -- Denormalized for query performance

  -- Client role on this matter
  client_role           NVARCHAR(50)    DEFAULT 'client', -- client, plaintiff, defendant, party, witness
  is_primary            BIT             DEFAULT 0,        -- Primary client for billing

  -- Metadata
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Constraints
  CONSTRAINT FK_matter_clients_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id) ON DELETE CASCADE,
  CONSTRAINT FK_matter_clients_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT FK_matter_clients_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT UQ_matter_client UNIQUE (matter_id, client_id)  -- Prevent duplicate client assignments
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Matters indexes
CREATE INDEX IX_matters_firm ON matters(firm_id);
CREATE INDEX IX_matters_status ON matters(firm_id, matter_status) WHERE is_deleted = 0;
CREATE INDEX IX_matters_type ON matters(firm_id, matter_type) WHERE is_deleted = 0;
CREATE INDEX IX_matters_number ON matters(matter_number);
CREATE INDEX IX_matters_firm_active ON matters(firm_id, is_deleted);

-- Matter_clients indexes
CREATE INDEX IX_matter_clients_matter ON matter_clients(matter_id);
CREATE INDEX IX_matter_clients_client ON matter_clients(client_id);
CREATE INDEX IX_matter_clients_firm ON matter_clients(firm_id);
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'matters' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matters';

SELECT 'matter_clients' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matter_clients';

PRINT '=== Qanuni SaaS matters + matter_clients tables created successfully ===';
