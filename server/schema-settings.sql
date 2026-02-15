-- ============================================================================
-- SETTINGS SCHEMA
-- 3 tables: settings, firm_currencies, exchange_rates
-- ============================================================================

-- Table 1: Settings (Key-Value Store)
IF OBJECT_ID('dbo.settings', 'U') IS NOT NULL DROP TABLE dbo.settings;
GO

CREATE TABLE settings (
  setting_id INT IDENTITY(1,1) PRIMARY KEY,
  firm_id INT NOT NULL,
  setting_key NVARCHAR(255) NOT NULL,
  setting_value NVARCHAR(MAX),
  setting_type NVARCHAR(50) DEFAULT 'string',
  category NVARCHAR(100) DEFAULT 'general',
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT FK_settings_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT UQ_settings_firm_key UNIQUE (firm_id, setting_key)
);
GO

CREATE INDEX IX_settings_firm ON settings(firm_id);
GO
CREATE INDEX IX_settings_category ON settings(category);
GO
CREATE INDEX IX_settings_key ON settings(setting_key);
GO

-- Table 2: Firm Currencies
IF OBJECT_ID('dbo.firm_currencies', 'U') IS NOT NULL DROP TABLE dbo.firm_currencies;
GO

CREATE TABLE firm_currencies (
  id INT IDENTITY(1,1) PRIMARY KEY,
  firm_id INT NULL,
  code NVARCHAR(10) NOT NULL,
  name NVARCHAR(100) NOT NULL,
  name_ar NVARCHAR(100),
  symbol NVARCHAR(10),
  sort_order INT DEFAULT 0,
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT FK_firm_currencies_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT UQ_firm_currencies_code UNIQUE (firm_id, code)
);
GO

CREATE INDEX IX_firm_currencies_firm ON firm_currencies(firm_id);
GO
CREATE INDEX IX_firm_currencies_active ON firm_currencies(is_active);
GO

-- Table 3: Exchange Rates
IF OBJECT_ID('dbo.exchange_rates', 'U') IS NOT NULL DROP TABLE dbo.exchange_rates;
GO

-- Seed data is inserted via run-schema-settings.js (Unicode safety)

CREATE TABLE exchange_rates (
  rate_id INT IDENTITY(1,1) PRIMARY KEY,
  firm_id INT NOT NULL,
  from_currency NVARCHAR(10) NOT NULL,
  to_currency NVARCHAR(10) NOT NULL,
  rate DECIMAL(18,8) NOT NULL,
  effective_date DATE NOT NULL,
  notes NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT FK_exchange_rates_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);
GO

CREATE INDEX IX_exchange_rates_firm ON exchange_rates(firm_id);
GO
CREATE INDEX IX_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
GO
CREATE INDEX IX_exchange_rates_date ON exchange_rates(effective_date);
GO
