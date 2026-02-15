-- ============================================================================
-- Qanuni SaaS - Appointments Table Schema
-- Version: 1.0.0 (Week 4 Day 19)
--
-- Standalone file - safe to run independently
-- ============================================================================

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.appointments', 'U') IS NOT NULL
  DROP TABLE dbo.appointments;
GO

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE appointments (
  appointment_id      INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT             NOT NULL,
  appointment_type    NVARCHAR(50)    NOT NULL DEFAULT 'client_meeting',
  title               NVARCHAR(500)   NOT NULL,
  description         NVARCHAR(MAX),
  appointment_date    DATE            NOT NULL,
  start_time          TIME,
  end_time            TIME,
  all_day             BIT             DEFAULT 0,
  location_type       NVARCHAR(50)    DEFAULT 'office',
  location_details    NVARCHAR(500),
  client_id           INT,
  matter_id           INT,
  billable            BIT             DEFAULT 0,
  attendees           NVARCHAR(MAX),  -- JSON string
  notes               NVARCHAR(MAX),
  status              NVARCHAR(20)    DEFAULT 'scheduled',
  created_by          INT             NOT NULL,
  created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  is_deleted          BIT             NOT NULL DEFAULT 0,

  -- Foreign keys
  CONSTRAINT FK_appointments_firms FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_appointments_clients FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT FK_appointments_matters FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_appointments_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Check constraints
  CONSTRAINT CHK_appointments_type CHECK (appointment_type IN ('client_meeting', 'court_appearance', 'internal_meeting', 'deadline', 'other')),
  CONSTRAINT CHK_appointments_location CHECK (location_type IN ('office', 'court', 'client_office', 'remote', 'other')),
  CONSTRAINT CHK_appointments_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled'))
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_appointments_firm ON appointments(firm_id) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_appointments_date ON appointments(appointment_date) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_appointments_client ON appointments(client_id) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_appointments_matter ON appointments(matter_id) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_appointments_status ON appointments(status) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'appointments' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments';

PRINT '=== Qanuni SaaS appointments table created successfully ===';
