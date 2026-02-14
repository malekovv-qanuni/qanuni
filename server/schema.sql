-- ============================================================================
-- Qanuni SaaS - SQL Server Schema
-- Version: 1.0.0 (Week 1 Day 3)
--
-- Tables: firms, users
-- Authentication: JWT-based, multi-tenant with firm_id isolation
-- ============================================================================

-- Drop tables in correct order (users depends on firms)
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
IF OBJECT_ID('dbo.firms', 'U') IS NOT NULL DROP TABLE dbo.firms;

-- ============================================================================
-- FIRMS TABLE
-- ============================================================================
CREATE TABLE firms (
    firm_id     INT IDENTITY(1,1) PRIMARY KEY,
    firm_name   NVARCHAR(255)   NOT NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    user_id         INT IDENTITY(1,1) PRIMARY KEY,
    firm_id         INT             NOT NULL,
    email           NVARCHAR(255)   NOT NULL,
    password_hash   NVARCHAR(255)   NOT NULL,
    full_name       NVARCHAR(255)   NULL,
    role            NVARCHAR(50)    NOT NULL DEFAULT 'user',
    is_active       BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    -- Foreign key to firms
    CONSTRAINT FK_users_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),

    -- Unique email across all firms
    CONSTRAINT UQ_users_email UNIQUE (email)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IX_users_email   ON users (email);
CREATE INDEX IX_users_firm_id ON users (firm_id);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'firms' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'firms'
UNION ALL
SELECT 'users' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users';

PRINT '=== Qanuni SaaS schema created successfully ===';
