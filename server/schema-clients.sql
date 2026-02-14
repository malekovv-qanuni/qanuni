-- ============================================================================
-- Qanuni SaaS - Clients Table Schema
-- Version: 1.0.0 (Week 1 Day 4)
--
-- Standalone file - safe to run independently without affecting firms/users
-- ============================================================================

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.clients', 'U') IS NOT NULL
  DROP TABLE dbo.clients;
GO

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE clients (
  client_id           INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT             NOT NULL,
  client_name         NVARCHAR(255)   NOT NULL,
  client_name_arabic  NVARCHAR(255),
  client_type         NVARCHAR(50)    DEFAULT 'individual',  -- 'individual' or 'legal_entity'
  email               NVARCHAR(255),
  phone               NVARCHAR(50),
  mobile              NVARCHAR(50),
  address             NVARCHAR(500),
  address_arabic      NVARCHAR(500),
  notes               NVARCHAR(MAX),
  is_active           BIT             NOT NULL DEFAULT 1,
  is_deleted          BIT             NOT NULL DEFAULT 0,
  created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  created_by          INT,

  -- Foreign keys
  CONSTRAINT FK_clients_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_clients_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IX_clients_firm_id    ON clients(firm_id);
CREATE INDEX IX_clients_email      ON clients(email);
CREATE INDEX IX_clients_is_deleted ON clients(is_deleted);

-- Composite index for common query pattern (firm's active clients)
CREATE INDEX IX_clients_firm_active ON clients(firm_id, is_deleted);
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'clients' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients';

PRINT '=== Qanuni SaaS clients table created successfully ===';
