-- ============================================================================
-- Qanuni SaaS - Tasks Table Schema
-- Version: 1.0.0 (Week 3 Day 11)
--
-- Standalone file - safe to run independently
-- Requires: firms, users, matters, clients, hearings, lawyers
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- Drop table if exists (safe for re-runs)
IF OBJECT_ID('dbo.tasks', 'U') IS NOT NULL
  DROP TABLE dbo.tasks;
GO

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE tasks (
  task_id               INT IDENTITY(1,1) PRIMARY KEY,
  firm_id               INT             NOT NULL,
  task_number           NVARCHAR(20)    NOT NULL,

  -- Core fields
  title                 NVARCHAR(500)   NOT NULL,
  description           NVARCHAR(MAX),
  instructions          NVARCHAR(MAX),

  -- Scheduling
  due_date              DATE,
  due_time              TIME,
  time_budget_minutes   INT,

  -- Classification
  priority              NVARCHAR(20)    NOT NULL DEFAULT 'medium',
  status                NVARCHAR(20)    NOT NULL DEFAULT 'assigned',

  -- Relationships (all optional)
  matter_id             INT,
  client_id             INT,
  hearing_id            INT,
  assigned_to           INT,

  -- Assignment tracking
  assigned_by           INT,
  assigned_date         DATE,
  completion_notes      NVARCHAR(MAX),
  completed_date        DATE,
  notes                 NVARCHAR(MAX),

  -- Future: task types lookup (not implemented yet)
  task_type_id          INT,

  -- Metadata
  is_deleted            BIT             NOT NULL DEFAULT 0,
  created_by            INT             NOT NULL,
  created_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

  -- Foreign keys
  CONSTRAINT FK_tasks_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id),
  CONSTRAINT FK_tasks_matter FOREIGN KEY (matter_id) REFERENCES matters(matter_id),
  CONSTRAINT FK_tasks_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT FK_tasks_hearing FOREIGN KEY (hearing_id) REFERENCES hearings(hearing_id),
  CONSTRAINT FK_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES lawyers(lawyer_id),
  CONSTRAINT FK_tasks_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(user_id),
  CONSTRAINT FK_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),

  -- Enum constraints
  CONSTRAINT CHK_tasks_priority CHECK (priority IN ('high', 'medium', 'low')),
  CONSTRAINT CHK_tasks_status CHECK (status IN ('assigned', 'in_progress', 'done', 'cancelled'))
);
GO

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_tasks_firm_status ON tasks(firm_id, status) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_tasks_matter ON tasks(matter_id) WHERE is_deleted = 0;
GO

CREATE NONCLUSTERED INDEX IX_tasks_assigned_to ON tasks(assigned_to) WHERE is_deleted = 0;
GO

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'tasks' AS table_name, COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks';
GO

PRINT '=== Qanuni SaaS tasks table created successfully ===';
GO
