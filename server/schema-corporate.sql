-- ============================================================================
-- Qanuni SaaS — Corporate Secretary Schema
-- 6 tables: corporate_entities, shareholders, directors,
--           share_transfers, commercial_register_filings, company_meetings
-- NOTE: firm_id(INT), client_id(INT), created_by(INT) match existing tables
-- ============================================================================

-- ==================== CORPORATE ENTITIES ====================
-- Links to clients table (client_type = 'legal_entity')
-- One corporate_entity per client

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'corporate_entities')
CREATE TABLE corporate_entities (
  entity_id           INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT            NOT NULL,
  client_id           INT            NOT NULL,
  registration_number NVARCHAR(100)  NULL,
  registration_date   DATE           NULL,
  registered_address  NVARCHAR(500)  NULL,
  share_capital       DECIMAL(18,2)  NULL,
  share_capital_currency NVARCHAR(10) DEFAULT 'USD',
  total_shares        INT            NULL,
  fiscal_year_end     NVARCHAR(10)   NULL,
  tax_id              NVARCHAR(100)  NULL,
  commercial_register NVARCHAR(200)  NULL,
  status              NVARCHAR(20)   DEFAULT 'active',
  notes               NVARCHAR(MAX)  NULL,
  created_by          INT            NULL,
  created_at          DATETIME2      DEFAULT GETUTCDATE(),
  updated_at          DATETIME2      DEFAULT GETUTCDATE(),
  is_deleted          BIT            DEFAULT 0,
  CONSTRAINT FK_corporate_entities_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_corporate_entities_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT UQ_corporate_entities_client UNIQUE (client_id),
  CONSTRAINT CK_corporate_entities_status CHECK (status IN ('active', 'inactive', 'dissolved', 'suspended'))
);
GO

-- ==================== SHAREHOLDERS ====================
-- Tracks ownership of shares per corporate entity

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shareholders')
CREATE TABLE shareholders (
  shareholder_id      INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT            NOT NULL,
  client_id           INT            NOT NULL,
  name                NVARCHAR(200)  NOT NULL,
  name_arabic         NVARCHAR(200)  NULL,
  id_number           NVARCHAR(100)  NULL,
  nationality         NVARCHAR(100)  NULL,
  shares_owned        INT            DEFAULT 0,
  share_class         NVARCHAR(50)   DEFAULT 'Ordinary',
  date_acquired       DATE           NULL,
  notes               NVARCHAR(MAX)  NULL,
  created_by          INT            NULL,
  created_at          DATETIME2      DEFAULT GETUTCDATE(),
  updated_at          DATETIME2      DEFAULT GETUTCDATE(),
  is_deleted          BIT            DEFAULT 0,
  CONSTRAINT FK_shareholders_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_shareholders_client FOREIGN KEY (client_id) REFERENCES clients(client_id)
);
GO

-- ==================== DIRECTORS ====================
-- Board members, officers, managers

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'directors')
CREATE TABLE directors (
  director_id         INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT            NOT NULL,
  client_id           INT            NOT NULL,
  name                NVARCHAR(200)  NOT NULL,
  name_arabic         NVARCHAR(200)  NULL,
  id_number           NVARCHAR(100)  NULL,
  nationality         NVARCHAR(100)  NULL,
  position            NVARCHAR(100)  DEFAULT 'Director',
  date_appointed      DATE           NULL,
  date_resigned       DATE           NULL,
  is_signatory        BIT            DEFAULT 0,
  notes               NVARCHAR(MAX)  NULL,
  created_by          INT            NULL,
  created_at          DATETIME2      DEFAULT GETUTCDATE(),
  updated_at          DATETIME2      DEFAULT GETUTCDATE(),
  is_deleted          BIT            DEFAULT 0,
  CONSTRAINT FK_directors_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_directors_client FOREIGN KEY (client_id) REFERENCES clients(client_id)
);
GO

-- ==================== SHARE TRANSFERS ====================
-- Tracks transfer/issuance/buyback of shares between shareholders

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'share_transfers')
CREATE TABLE share_transfers (
  transfer_id             INT IDENTITY(1,1) PRIMARY KEY,
  firm_id                 INT            NOT NULL,
  client_id               INT            NOT NULL,
  transfer_type           NVARCHAR(20)   NOT NULL,
  transfer_date           DATE           NOT NULL,
  from_shareholder_id     INT            NULL,
  to_shareholder_id       INT            NULL,
  from_shareholder_name   NVARCHAR(200)  NULL,
  to_shareholder_name     NVARCHAR(200)  NULL,
  shares_transferred      INT            NOT NULL,
  price_per_share         DECIMAL(18,4)  NULL,
  total_consideration     DECIMAL(18,2)  NULL,
  share_class             NVARCHAR(50)   DEFAULT 'Ordinary',
  board_resolution        NVARCHAR(500)  NULL,
  notes                   NVARCHAR(MAX)  NULL,
  created_by              INT            NULL,
  created_at              DATETIME2      DEFAULT GETUTCDATE(),
  updated_at              DATETIME2      DEFAULT GETUTCDATE(),
  is_deleted              BIT            DEFAULT 0,
  CONSTRAINT FK_share_transfers_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_share_transfers_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT FK_share_transfers_from FOREIGN KEY (from_shareholder_id) REFERENCES shareholders(shareholder_id),
  CONSTRAINT FK_share_transfers_to FOREIGN KEY (to_shareholder_id) REFERENCES shareholders(shareholder_id),
  CONSTRAINT CK_share_transfers_type CHECK (transfer_type IN ('transfer', 'issuance', 'buyback', 'redemption'))
);
GO

-- ==================== COMMERCIAL REGISTER FILINGS ====================
-- Filing/document tracking for corporate compliance

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'commercial_register_filings')
CREATE TABLE commercial_register_filings (
  filing_id           INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT            NOT NULL,
  client_id           INT            NOT NULL,
  filing_type         NVARCHAR(100)  NOT NULL,
  filing_description  NVARCHAR(500)  NULL,
  filing_date         DATE           NOT NULL,
  filing_reference    NVARCHAR(200)  NULL,
  next_due_date       DATE           NULL,
  reminder_days       INT            DEFAULT 30,
  notes               NVARCHAR(MAX)  NULL,
  status              NVARCHAR(20)   DEFAULT 'completed',
  created_by          INT            NULL,
  created_at          DATETIME2      DEFAULT GETUTCDATE(),
  updated_at          DATETIME2      DEFAULT GETUTCDATE(),
  is_deleted          BIT            DEFAULT 0,
  CONSTRAINT FK_filings_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_filings_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT CK_filings_status CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled'))
);
GO

-- ==================== COMPANY MEETINGS ====================
-- Board meetings, AGMs, EGMs tracking

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'company_meetings')
CREATE TABLE company_meetings (
  meeting_id          INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT            NOT NULL,
  client_id           INT            NOT NULL,
  meeting_type        NVARCHAR(100)  NOT NULL,
  meeting_description NVARCHAR(500)  NULL,
  meeting_date        DATE           NOT NULL,
  meeting_notes       NVARCHAR(MAX)  NULL,
  attendees           NVARCHAR(MAX)  NULL,
  next_meeting_date   DATE           NULL,
  next_meeting_agenda NVARCHAR(MAX)  NULL,
  reminder_days       INT            DEFAULT 14,
  status              NVARCHAR(20)   DEFAULT 'held',
  created_by          INT            NULL,
  created_at          DATETIME2      DEFAULT GETUTCDATE(),
  updated_at          DATETIME2      DEFAULT GETUTCDATE(),
  is_deleted          BIT            DEFAULT 0,
  CONSTRAINT FK_meetings_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_meetings_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT CK_meetings_status CHECK (status IN ('scheduled', 'held', 'cancelled', 'postponed'))
);
GO
