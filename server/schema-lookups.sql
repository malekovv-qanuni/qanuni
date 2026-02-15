-- ============================================================================
-- Qanuni SaaS - Lookup Tables Schema
-- Version: 1.0.0 (Week 4 Day 20)
--
-- 6 lookup tables with hybrid firm scoping:
--   System items: is_system = 1, firm_id = NULL (global, shared by all firms)
--   User items: is_system = 0, firm_id = set (firm-scoped)
--
-- Seed data: EXACT match to electron/schema.js (desktop version)
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- TABLE 1: COURT TYPES (Lebanese courts)
-- ============================================================================
IF OBJECT_ID('dbo.lookup_court_types', 'U') IS NOT NULL
  DROP TABLE dbo.lookup_court_types;
GO

CREATE TABLE lookup_court_types (
  court_type_id       INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT NULL,
  name_en             NVARCHAR(255) NOT NULL,
  name_ar             NVARCHAR(255),
  name_fr             NVARCHAR(255),
  is_system           BIT DEFAULT 0,
  sort_order          INT DEFAULT 0,
  is_active           BIT DEFAULT 1,
  created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_court_types_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE INDEX IX_court_types_firm ON lookup_court_types(firm_id);
CREATE INDEX IX_court_types_active ON lookup_court_types(is_active);
GO

-- Seed: 17 Lebanese court types (EXACT from electron/schema.js lines 695-718)
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Single Judge Civil', N'القاضي المنفرد المدني', N'Juge Unique Civil', 1, 1);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Single Judge Criminal', N'القاضي المنفرد الجزائي', N'Juge Unique Pénal', 1, 2);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Urgent Matters', N'الأمور المستعجلة', N'Référés', 1, 3);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'First Instance', N'المحكمة الابتدائية', N'Première Instance', 1, 4);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Investigating Judge', N'قاضي التحقيق', N'Juge d''Instruction', 1, 5);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Indictment Chamber', N'الهيئة الاتهامية', N'Chambre Accusatoire', 1, 6);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Criminal Court', N'محكمة الجنايات', N'Chambre Criminelle', 1, 7);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Execution Judge', N'قاضي التنفيذ', N'Juge de l''Exécution', 1, 8);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Civil Appeal', N'استئناف مدني', N'Cour d''Appel Civil', 1, 9);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Criminal Appeal', N'استئناف جزائي', N'Cour d''Appel Pénal', 1, 10);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Civil Cassation', N'تمييز مدني', N'Cour de Cassation Civile', 1, 11);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Criminal Cassation', N'تمييز جزائي', N'Cour de Cassation Pénale', 1, 12);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Labor Tribunal', N'مجلس العمل التحكيمي', N'Conseil de Prud''hommes', 1, 13);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Plenary Assembly', N'الهيئة العامة', N'Assemblée Plénière', 1, 14);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Council of State', N'مجلس شورى الدولة', N'Conseil d''État', 1, 15);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Arbitrator', N'محكّم', N'Arbitre', 1, 16);
INSERT INTO lookup_court_types (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Arbitration Panel', N'هيئة تحكيمية', N'Tribunal Arbitral', 1, 17);
GO

-- ============================================================================
-- TABLE 2: REGIONS (Lebanese judicial districts)
-- ============================================================================
IF OBJECT_ID('dbo.lookup_regions', 'U') IS NOT NULL
  DROP TABLE dbo.lookup_regions;
GO

CREATE TABLE lookup_regions (
  region_id           INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT NULL,
  name_en             NVARCHAR(255) NOT NULL,
  name_ar             NVARCHAR(255),
  name_fr             NVARCHAR(255),
  is_system           BIT DEFAULT 0,
  sort_order          INT DEFAULT 0,
  is_active           BIT DEFAULT 1,
  created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_regions_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE INDEX IX_regions_firm ON lookup_regions(firm_id);
CREATE INDEX IX_regions_active ON lookup_regions(is_active);
GO

-- Seed: 12 Lebanese regions (EXACT from electron/schema.js lines 722-740)
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Beirut', N'بيروت', N'Beyrouth', 1, 1);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Mount Lebanon', N'جبل لبنان', N'Mont-Liban', 1, 2);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Metn', N'المتن', N'Metn', 1, 3);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Batroun', N'البترون', N'Batroun', 1, 4);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Jbeil', N'جبيل', N'Jbeil', 1, 5);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Jounieh', N'جونية', N'Jounieh', 1, 6);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'North Lebanon', N'الشمال', N'Liban-Nord', 1, 7);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'South Lebanon', N'الجنوب', N'Liban-Sud', 1, 8);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Bekaa', N'البقاع', N'Békaa', 1, 9);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Nabatieh', N'النبطية', N'Nabatieh', 1, 10);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Akkar', N'عكار', N'Akkar', 1, 11);
INSERT INTO lookup_regions (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Baalbek', N'بعلبك', N'Baalbek', 1, 12);
GO

-- ============================================================================
-- TABLE 3: HEARING PURPOSES
-- ============================================================================
IF OBJECT_ID('dbo.lookup_hearing_purposes', 'U') IS NOT NULL
  DROP TABLE dbo.lookup_hearing_purposes;
GO

CREATE TABLE lookup_hearing_purposes (
  purpose_id          INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT NULL,
  name_en             NVARCHAR(255) NOT NULL,
  name_ar             NVARCHAR(255),
  name_fr             NVARCHAR(255),
  is_system           BIT DEFAULT 0,
  sort_order          INT DEFAULT 0,
  is_active           BIT DEFAULT 1,
  created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_hearing_purposes_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE INDEX IX_hearing_purposes_firm ON lookup_hearing_purposes(firm_id);
CREATE INDEX IX_hearing_purposes_active ON lookup_hearing_purposes(is_active);
GO

-- Seed: 10 hearing purposes (EXACT from electron/schema.js lines 744-760)
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'First Session', N'الجلسة الأولى', N'Première audience', 1, 1);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Pleadings Exchange', N'تبادل اللوائح', N'Échange de conclusions', 1, 2);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Evidence Submission', N'تقديم المستندات', N'Production de preuves', 1, 3);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Witness Hearing', N'سماع الشهود', N'Audition de témoins', 1, 4);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Expert Report Discussion', N'مناقشة تقرير الخبير', N'Discussion du rapport d''expert', 1, 5);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Final Arguments', N'المرافعات الختامية', N'Plaidoiries finales', 1, 6);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Judgment Pronouncement', N'النطق بالحكم', N'Prononcé du jugement', 1, 7);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Procedural', N'إجرائية', N'Procédurale', 1, 8);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Settlement Discussion', N'مناقشة التسوية', N'Discussion de règlement', 1, 9);
INSERT INTO lookup_hearing_purposes (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Other', N'أخرى', N'Autre', 1, 10);
GO

-- ============================================================================
-- TABLE 4: TASK TYPES (includes icon column)
-- ============================================================================
IF OBJECT_ID('dbo.lookup_task_types', 'U') IS NOT NULL
  DROP TABLE dbo.lookup_task_types;
GO

CREATE TABLE lookup_task_types (
  task_type_id        INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT NULL,
  name_en             NVARCHAR(255) NOT NULL,
  name_ar             NVARCHAR(255),
  name_fr             NVARCHAR(255),
  icon                NVARCHAR(50),
  is_system           BIT DEFAULT 0,
  sort_order          INT DEFAULT 0,
  is_active           BIT DEFAULT 1,
  created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_task_types_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE INDEX IX_task_types_firm ON lookup_task_types(firm_id);
CREATE INDEX IX_task_types_active ON lookup_task_types(is_active);
GO

-- Seed: 11 task types (EXACT from electron/schema.js lines 764-781)
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Memo', N'مذكرة', N'Mémo', N'📝', 1, 1);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Document Preparation', N'إعداد مستند', N'Préparation de document', N'📄', 1, 2);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Filing', N'إيداع', N'Dépôt', N'📁', 1, 3);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Follow-up', N'متابعة', N'Suivi', N'🔄', 1, 4);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Research', N'بحث', N'Recherche', N'🔍', 1, 5);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Review', N'مراجعة', N'Révision', N'👁', 1, 6);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Client Communication', N'تواصل مع العميل', N'Communication client', N'💬', 1, 7);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Court Attendance', N'حضور المحكمة', N'Présence au tribunal', N'⚖️', 1, 8);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Meeting', N'اجتماع', N'Réunion', N'🤝', 1, 9);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'Call', N'مكالمة', N'Appel', N'📞', 1, 10);
INSERT INTO lookup_task_types (name_en, name_ar, name_fr, icon, is_system, sort_order) VALUES (N'General', N'عام', N'Général', N'✅', 1, 11);
GO

-- ============================================================================
-- TABLE 5: EXPENSE CATEGORIES
-- ============================================================================
IF OBJECT_ID('dbo.lookup_expense_categories', 'U') IS NOT NULL
  DROP TABLE dbo.lookup_expense_categories;
GO

CREATE TABLE lookup_expense_categories (
  category_id         INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT NULL,
  name_en             NVARCHAR(255) NOT NULL,
  name_ar             NVARCHAR(255),
  name_fr             NVARCHAR(255),
  is_system           BIT DEFAULT 0,
  sort_order          INT DEFAULT 0,
  is_active           BIT DEFAULT 1,
  created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_expense_categories_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE INDEX IX_expense_categories_firm ON lookup_expense_categories(firm_id);
CREATE INDEX IX_expense_categories_active ON lookup_expense_categories(is_active);
GO

-- Seed: 10 expense categories (EXACT from electron/schema.js lines 785-801)
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Court Fees', N'رسوم المحكمة', N'Frais de justice', 1, 1);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Filing Fees', N'رسوم الإيداع', N'Frais de dépôt', 1, 2);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Travel', N'سفر', N'Déplacement', 1, 3);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Expert Fees', N'أتعاب الخبير', N'Honoraires d''expert', 1, 4);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Translation', N'ترجمة', N'Traduction', 1, 5);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Courier', N'بريد سريع', N'Courrier', 1, 6);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Notary Fees', N'رسوم كاتب العدل', N'Frais de notaire', 1, 7);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Government Fees', N'رسوم حكومية', N'Frais gouvernementaux', 1, 8);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Photocopying', N'تصوير', N'Photocopie', 1, 9);
INSERT INTO lookup_expense_categories (name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'Other', N'أخرى', N'Autre', 1, 10);
GO

-- ============================================================================
-- TABLE 6: ENTITY TYPES (Lebanese company types - includes code column)
-- Note: is_system defaults to 1 (unlike other tables which default to 0)
-- Note: sort_order has NO default (unlike other tables which default to 0)
-- ============================================================================
IF OBJECT_ID('dbo.lookup_entity_types', 'U') IS NOT NULL
  DROP TABLE dbo.lookup_entity_types;
GO

CREATE TABLE lookup_entity_types (
  entity_type_id      INT IDENTITY(1,1) PRIMARY KEY,
  firm_id             INT NULL,
  code                NVARCHAR(20) UNIQUE,
  name_en             NVARCHAR(255) NOT NULL,
  name_ar             NVARCHAR(255),
  name_fr             NVARCHAR(255),
  is_system           BIT DEFAULT 1,
  sort_order          INT,
  is_active           BIT DEFAULT 1,
  created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_entity_types_firm FOREIGN KEY (firm_id) REFERENCES firms(firm_id)
);

CREATE INDEX IX_entity_types_firm ON lookup_entity_types(firm_id);
CREATE INDEX IX_entity_types_active ON lookup_entity_types(is_active);
GO

-- Seed: 13 Lebanese entity types (EXACT from electron/schema.js lines 805-824)
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'SAL', N'Joint Stock Company', N'شركة مساهمة لبنانية', N'Société Anonyme Libanaise', 1, 1);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'SARL', N'Limited Liability Company', N'شركة محدودة المسؤولية', N'SARL', 1, 2);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'HOLDING', N'Holding Company', N'شركة قابضة', N'Société Holding', 1, 3);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'OFFSHORE', N'Offshore Company', N'شركة أوفشور', N'Société Offshore', 1, 4);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'PARTNERSHIP', N'General Partnership', N'شركة تضامن', N'Société en Nom Collectif', 1, 5);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'LIMITED_PARTNER', N'Limited Partnership', N'شركة توصية بسيطة', N'Société en Commandite Simple', 1, 6);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'BRANCH', N'Foreign Branch', N'فرع شركة أجنبية', N'Succursale Étrangère', 1, 7);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'REP_OFFICE', N'Representative Office', N'مكتب تمثيلي', N'Bureau de Représentation', 1, 8);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'SOLE_PROP', N'Sole Proprietorship', N'مؤسسة فردية', N'Entreprise Individuelle', 1, 9);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'NGO', N'Non-Profit Organization', N'جمعية', N'Association', 1, 10);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'CIVIL', N'Civil Company', N'شركة مدنية', N'Société Civile', 1, 11);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'SINGLE_OFFSHORE', N'Single Partner Offshore', N'شركة أوفشور شريك واحد', N'Offshore à Associé Unique', 1, 12);
INSERT INTO lookup_entity_types (code, name_en, name_ar, name_fr, is_system, sort_order) VALUES (N'SINGLE_SARL', N'Single Partner SARL', N'شركة محدودة المسؤولية شريك واحد', N'SARL à Associé Unique', 1, 13);
GO
