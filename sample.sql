-- ==============================
-- Custom Types (ENUM)
-- ==============================

CREATE TYPE opportunity_stage AS ENUM (
    'lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
);

CREATE TYPE interaction_type AS ENUM (
    'call', 'email', 'meeting', 'note', 'task'
);

-- ==============================
-- Table Creation
-- ==============================

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    industry VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE companies IS 'Stores information about companies/accounts (organizational customers).';
COMMENT ON COLUMN companies.id IS 'Short unique ID (16 characters alphanumeric).';
COMMENT ON COLUMN companies.is_active IS 'Whether the company is still active.';

CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(16) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    company_id VARCHAR(16) REFERENCES companies(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    position VARCHAR(100),
    notes TEXT,
    is_primary BOOLEAN DEFAULT FALSE,  -- Added boolean field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE contacts IS 'Stores information about individual contacts/people.';
COMMENT ON COLUMN contacts.id IS 'Short unique ID (16 characters alphanumeric).';
COMMENT ON COLUMN contacts.is_primary IS 'Indicates if this is the primary contact for the company.';

CREATE TABLE IF NOT EXISTS opportunities (
    id VARCHAR(16) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company_id VARCHAR(16) REFERENCES companies(id) ON DELETE CASCADE,
    contact_id VARCHAR(16) REFERENCES contacts(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) DEFAULT 0.00 CHECK (amount >= 0),
    stage opportunity_stage DEFAULT 'lead',
    probability INTEGER DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    notes TEXT,
    is_high_priority BOOLEAN DEFAULT FALSE,  -- Added boolean field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE opportunities IS 'Manages sales opportunities/deals.';
COMMENT ON COLUMN opportunities.id IS 'Short unique ID (16 characters alphanumeric).';
COMMENT ON COLUMN opportunities.stage IS 'Sales stage (ENUM).';
COMMENT ON COLUMN opportunities.is_high_priority IS 'Marks high-priority opportunities.';

CREATE TABLE IF NOT EXISTS interactions (
    id VARCHAR(16) PRIMARY KEY,
    type interaction_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    company_id VARCHAR(16) REFERENCES companies(id) ON DELETE CASCADE,
    contact_id VARCHAR(16) REFERENCES contacts(id) ON DELETE CASCADE,
    opportunity_id VARCHAR(16) REFERENCES opportunities(id) ON DELETE SET NULL,
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_completed BOOLEAN DEFAULT FALSE,  -- Added boolean field (useful for tasks/meetings)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE interactions IS 'Records history of interactions with customers.';
COMMENT ON COLUMN interactions.id IS 'Short unique ID (16 characters alphanumeric).';
COMMENT ON COLUMN interactions.type IS 'Interaction type (ENUM).';
COMMENT ON COLUMN interactions.is_completed IS 'Whether the interaction/task is completed.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_opportunity ON interactions(opportunity_id);

-- ==============================
-- Sample Data Insertion (with shortids)
-- ==============================

-- 1. Companies
INSERT INTO companies (id, name, address, phone, email, website, industry, is_active) VALUES
('EzKjRPkLM33PHmkX', 'FPT Corporation', 'FPT Building, Cau Giay, Hanoi', '+84 24 7300 7300', 'info@fpt.com.vn', 'https://fpt.com.vn', 'Information Technology', TRUE),
('q2vPke8rR1lqhNBP', 'Viettel Solutions', 'Viettel Tower, Nam Tu Liem, Hanoi', '+84 24 6266 0101', 'contact@viettel.com.vn', 'https://viettelsolutions.com.vn', 'Telecommunications', TRUE),
('QZtyAHhywQmcH9ku', 'Vingroup', 'Vinhomes Central Park, Ho Chi Minh City', '+84 28 3971 9999', 'info@vingroup.net', 'https://vingroup.net', 'Real Estate & Conglomerate', TRUE),
('8MHierpogrPfuKtO', 'Techcombank', '191 Ba Trieu, Hanoi', '+84 24 3944 9600', 'support@techcombank.com.vn', 'https://techcombank.com', 'Banking', TRUE),
('vBuWX3r2mEXQNwg6', 'VNPT Technology', '57 Huynh Thuc Khang, Hanoi', '+84 24 3772 8888', 'info@vnpt-technology.vn', 'https://vnpt-technology.vn', 'Technology', TRUE),
('Hru6mLj0Oc0Qfwm4', 'MobiFone', 'MobiFone Building, District 1, HCMC', '+84 28 3829 8888', 'cskh@mobifone.vn', 'https://mobifone.vn', 'Telecommunications', TRUE),
('XttedLE2rX5sJ2dJ', 'Shopee Vietnam', 'Mapletree Building, District 7, HCMC', '+84 28 7308 0000', 'support@shopee.vn', 'https://shopee.vn', 'E-commerce', TRUE),
('vJuooIwIu1w8Eht4', 'Tiki Corporation', 'Tan Binh District, HCMC', '+84 1900 6035', 'hotro@tiki.vn', 'https://tiki.vn', 'E-commerce', TRUE),
('W5qe7aSOzd4mdaIG', 'Masan Group', 'Masan Tower, District 1, HCMC', '+84 28 3825 8888', 'info@masan.com', 'https://masangroup.com', 'Consumer Goods', TRUE),
('p0HdoeUhqqpPBpYa', 'Samsung Electronics Vietnam', 'Yen Phong Industrial Zone, Bac Ninh', '+84 24 1730 0600', 'info@samsung.com.vn', 'https://samsung.com.vn', 'Electronics', TRUE),
('8zSw6OJsxhsJivRP', 'Honda Vietnam', 'Phuc Thang Industrial Zone, Vinh Phuc', '+84 211 386 5050', 'info@honda.com.vn', 'https://honda.com.vn', 'Automotive', TRUE),
('g1bNg30X2H6g32KS', 'Piaggio Vietnam', 'Dinh Vu Industrial Zone, Hai Phong', '+84 225 383 5555', 'contact@piaggio.vn', 'https://piaggio.com.vn', 'Motorcycles', TRUE),
('Vc1LbxKBpkj8q9Wy', 'Vinamilk', '10 Tan Trao, District 7, HCMC', '+84 28 5415 5555', 'info@vinamilk.com.vn', 'https://vinamilk.com.vn', 'Dairy & Food', TRUE),
('SVEGkJ3TipHaMSDJ', 'ACB Bank', '442 Nguyen Thi Minh Khai, District 3, HCMC', '+84 28 3824 7777', 'contact@acb.com.vn', 'https://acb.com.vn', 'Banking', TRUE),
('MON8ZcA5YqXPuCCo', 'VNG Corporation', 'Zion Building, District 1, HCMC', '+84 28 3820 6868', 'info@vng.com.vn', 'https://vng.com.vn', 'Technology & Gaming', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 2. Contacts (with shortids and is_primary example)
INSERT INTO contacts (id, first_name, last_name, company_id, email, phone, position, notes, is_primary) VALUES
('bUgplEaz5WsPLJdT', 'John', 'Nguyen', 'EzKjRPkLM33PHmkX', 'john.nguyen@fpt.com.vn', '+84 912 345 678', 'Sales Director', 'Main decision maker for large projects', TRUE),
('8ZQ6wGS8murRFX3A', 'Anna', 'Tran', 'q2vPke8rR1lqhNBP', 'anna.tran@viettel.com.vn', '+84 988 123 456', 'Project Manager', 'Interested in cloud migration', TRUE),
('tgkVAVPC9GxGj6pG', 'Michael', 'Le', 'QZtyAHhywQmcH9ku', 'michael.le@vingroup.net', '+84 909 876 543', 'Vice President', 'Expanding real estate division', TRUE),
('3MsqzXvaMaO9nLdK', 'David', 'Pham', '8MHierpogrPfuKtO', 'david.pham@techcombank.com.vn', '+84 977 654 321', 'Head of IT', 'Evaluating new CRM system', TRUE),
('OPJfl3T7O9CvBWxm', 'Lisa', 'Ho', 'vBuWX3r2mEXQNwg6', 'lisa.ho@vnpt-technology.vn', '+84 933 456 789', 'CEO', 'State-owned tech startup', TRUE),
('88JAdlIUVXyc6WvW', 'Emma', 'Vu', 'EzKjRPkLM33PHmkX', 'emma.vu@fpt.com.vn', '+84 912 987 654', 'Executive Assistant', 'Handles scheduling', FALSE),
('gkU8fKhaZc0Dm3ag', 'Kevin', 'Dang', 'Hru6mLj0Oc0Qfwm4', 'kevin.dang@mobifone.vn', '+84 986 111 222', 'Regional Director', NULL, TRUE),
('u8hr9tDrYdMdMX7l', 'Sophia', 'Bui', 'XttedLE2rX5sJ2dJ', 'sophia.bui@shopee.vn', '+84 935 222 333', 'Head of Logistics', 'Interested in warehouse solutions', TRUE),
('fnI5T6uhb67WAGAp', 'James', 'Ngo', 'vJuooIwIu1w8Eht4', 'james.ngo@tiki.vn', '+84 901 333 444', 'CTO', 'Looking for AI recommendation engine', TRUE),
('VV6kvawaiCrsae8M', 'Olivia', 'Hoang', 'W5qe7aSOzd4mdaIG', 'olivia.hoang@masan.com', '+84 908 444 555', 'Marketing Director', NULL, TRUE),
('oguuVTLaym6WSDYL', 'William', 'Ly', 'p0HdoeUhqqpPBpYa', 'william.ly@samsung.com.vn', '+84 913 555 666', 'Supply Chain Manager', 'Needs new ERP', TRUE),
('I5HoMyheGBlgQkpD', 'Grace', 'Truong', '8zSw6OJsxhsJivRP', 'grace.truong@honda.com.vn', '+84 979 666 777', 'Sales Director', NULL, TRUE),
('Ub3Exi638S4tbGTL', 'Henry', 'Do', 'g1bNg30X2H6g32KS', 'henry.do@piaggio.vn', '+84 914 777 888', 'HR Director', 'Large recruitment drive', TRUE),
('ZLGjDJ3ATnVVAgC2', 'Isabella', 'Phan', 'Vc1LbxKBpkj8q9Wy', 'isabella.phan@vinamilk.com.vn', '+84 902 888 999', 'IT Manager', 'Upgrading distribution system', TRUE),
('VkPMvRU5jYcM0Oet', 'Alexander', 'Vo', 'SVEGkJ3TipHaMSDJ', 'alexander.vo@acb.com.vn', '+84 911 999 000', 'Risk Manager', NULL, TRUE),
('0NCZYbgqUmSBAx0m', 'Mia', 'Mai', 'MON8ZcA5YqXPuCCo', 'mia.mai@vng.com.vn', '+84 989 000 111', 'Product Director', 'Game platform expansion', TRUE),
('eWhVBQGH02SR7PI5', 'Ethan', 'Ha', 'EzKjRPkLM33PHmkX', 'ethan.ha@fpt.com.vn', '+84 936 111 222', 'Lead Developer', 'Software development partnership', FALSE),
('7klUuDkdD2WUbY7I', 'Charlotte', 'Dinh', 'q2vPke8rR1lqhNBP', 'charlotte.dinh@viettel.com.vn', '+84 903 222 333', 'Product Owner', NULL, FALSE),
('FZDqVScUixuK9DHV', 'Daniel', 'Chu', '8MHierpogrPfuKtO', 'daniel.chu@techcombank.com.vn', '+84 979 333 444', 'Data Analyst', 'Interested in BI tools', FALSE),
('9OfDViZjxKr71ghp', 'Amelia', 'To', 'XttedLE2rX5sJ2dJ', 'amelia.to@shopee.vn', '+84 914 444 555', 'Finance Manager', NULL, FALSE)
ON CONFLICT (email) DO NOTHING;

-- 3. Opportunities (with some high_priority examples)
INSERT INTO opportunities (id, title, company_id, contact_id, amount, stage, probability, expected_close_date, notes, is_high_priority) VALUES
('AIXgk5LvSwXb37nZ', 'Enterprise-wide ERP Implementation', 'EzKjRPkLM33PHmkX', 'bUgplEaz5WsPLJdT', 2500000000.00, 'proposal', 75, '2026-04-30', 'Detailed proposal sent', TRUE),
('EsKn6ZnsnTVWSMVf', 'Cloud Migration Services', 'q2vPke8rR1lqhNBP', '8ZQ6wGS8murRFX3A', 1800000000.00, 'negotiation', 90, '2026-02-15', 'Final price negotiation', TRUE),
('DO8TY59dGditNFET', 'Internal CRM System Development', '8MHierpogrPfuKtO', '3MsqzXvaMaO9nLdK', 3200000000.00, 'qualified', 60, '2026-06-30', 'Advanced reporting demo requested', TRUE),
('cXDJPkiNYZSSzfCg', 'E-commerce Platform Enhancement', 'XttedLE2rX5sJ2dJ', 'u8hr9tDrYdMdMX7l', 5000000000.00, 'lead', 30, NULL, 'Initial contact from conference', FALSE),
('Lfl5E2wvMGrHPnvJ', 'Smart Warehouse System Upgrade', 'vJuooIwIu1w8Eht4', 'fnI5T6uhb67WAGAp', 1500000000.00, 'proposal', 65, '2026-03-31', 'AI integration interest', FALSE),
('HNuMUV7ebEjXGr1B', 'Supply Chain Management System', 'W5qe7aSOzd4mdaIG', 'VV6kvawaiCrsae8M', 2200000000.00, 'qualified', 55, '2026-05-15', NULL, FALSE),
('fxVYciNv9IDhbuDK', 'Digital Banking Transformation', 'SVEGkJ3TipHaMSDJ', 'VkPMvRU5jYcM0Oet', 4000000000.00, 'negotiation', 80, '2026-03-01', 'NDA signed', TRUE),
('zWrK44s9C1raCnpg', 'Manufacturing Execution System (MES)', 'p0HdoeUhqqpPBpYa', 'oguuVTLaym6WSDYL', 3500000000.00, 'closed_won', 100, '2025-12-01', 'Contract signed', FALSE),
('aJ0Lrzo0sBshY9aI', 'Mobile Sales App Development', '8zSw6OJsxhsJivRP', 'I5HoMyheGBlgQkpD', 800000000.00, 'lead', 20, NULL, 'Requirement gathering', FALSE),
('3Gl7ZDcBui3qq8Yf', 'HR Management System (HRM)', 'g1bNg30X2H6g32KS', 'Ub3Exi638S4tbGTL', 1200000000.00, 'proposal', 70, '2026-04-15', NULL, FALSE),
('vztqFnkmVKxI4mFn', 'Distribution System Upgrade', 'Vc1LbxKBpkj8q9Wy', 'ZLGjDJ3ATnVVAgC2', 2800000000.00, 'qualified', 50, '2026-07-31', 'GPS tracking integration needed', FALSE),
('eHrAmv3ElCICpVma', 'Digital Transformation Consulting', 'vBuWX3r2mEXQNwg6', 'OPJfl3T7O9CvBWxm', 900000000.00, 'lead', 25, NULL, NULL, FALSE),
('iAWZfkWU9Ce0B7dn', 'AI for Banking Fraud Detection', '8MHierpogrPfuKtO', 'FZDqVScUixuK9DHV', 1800000000.00, 'proposal', 60, '2026-05-30', 'Fraud detection focus', TRUE),
('ZjsPSKcj1O4lNURH', 'Infrastructure Maintenance Contract Renewal', 'Hru6mLj0Oc0Qfwm4', 'gkU8fKhaZc0Dm3ag', 600000000.00, 'closed_won', 100, '2025-11-15', 'Renewed existing contract', FALSE),
('ld7IhSBR9DKeslaj', 'Customer Loyalty Platform', 'QZtyAHhywQmcH9ku', 'tgkVAVPC9GxGj6pG', 2100000000.00, 'negotiation', 85, '2026-02-28', NULL, TRUE),
('GcqMKQ38feG1n2cF', 'Blockchain Traceability Project', 'Vc1LbxKBpkj8q9Wy', 'ZLGjDJ3ATnVVAgC2', 700000000.00, 'lead', 15, NULL, 'Technology evaluation', FALSE),
('K0FWQRGY1SVj4P60', 'Private 5G Network Deployment', 'q2vPke8rR1lqhNBP', '7klUuDkdD2WUbY7I', 4500000000.00, 'qualified', 45, '2026-08-31', NULL, FALSE),
('Zlhtmrh9ObRbsyCB', 'Software Development Partnership', 'EzKjRPkLM33PHmkX', 'eWhVBQGH02SR7PI5', 1100000000.00, 'closed_lost', 0, '2025-10-01', 'Lost to competitor', FALSE)
ON CONFLICT DO NOTHING;

-- 4. Interactions (with some is_completed examples)
INSERT INTO interactions (id, type, subject, description, company_id, contact_id, opportunity_id, interaction_date, created_by, is_completed) VALUES
('H5ivtOlIneQiJE7a', 'call', 'Initial Product Introduction', 'Introduced ERP solution; John interested and scheduled demo', 'EzKjRPkLM33PHmkX', 'bUgplEaz5WsPLJdT', 'AIXgk5LvSwXb37nZ', '2025-11-20 10:00:00+07', 'Sales Team A', TRUE),
('UGV3n31gck5uzefA', 'meeting', 'CRM System Demo', '2-hour online demo; positive feedback', '8MHierpogrPfuKtO', '3MsqzXvaMaO9nLdK', 'DO8TY59dGditNFET', '2025-12-10 14:00:00+07', 'Sales Team B', TRUE),
('f2RV9sou2BIolBAx', 'email', 'Sent Detailed Proposal', 'Attached proposal PDF and pricing', 'q2vPke8rR1lqhNBP', '8ZQ6wGS8murRFX3A', 'EsKn6ZnsnTVWSMVf', '2025-12-05 09:30:00+07', 'Sales Team A', TRUE),
('tpmdtIe7DyK82QBS', 'note', 'Internal Note', 'Customer prefers on-premise deployment', 'p0HdoeUhqqpPBpYa', 'oguuVTLaym6WSDYL', 'zWrK44s9C1raCnpg', '2025-11-15 16:00:00+07', 'Sales Manager', TRUE),
('4YUqS4bvNd2NapUn', 'task', 'Contract Follow-up', 'Reminder to sign before year-end', 'SVEGkJ3TipHaMSDJ', 'VkPMvRU5jYcM0Oet', 'fxVYciNv9IDhbuDK', '2025-12-20 08:00:00+07', 'Account Manager', FALSE),
('2Rp5bUrrkB5M2E6l', 'call', 'Post-Conference Follow-up', 'Sophia interested in logistics solution', 'XttedLE2rX5sJ2dJ', 'u8hr9tDrYdMdMX7l', 'cXDJPkiNYZSSzfCg', '2025-12-01 11:00:00+07', 'Sales Team C', TRUE),
('crV52zmpUNUDzg5G', 'email', 'Reference Materials Sent', 'Sent relevant case studies', 'vJuooIwIu1w8Eht4', 'fnI5T6uhb67WAGAp', 'Lfl5E2wvMGrHPnvJ', '2025-12-12 15:00:00+07', 'Sales Team B', TRUE),
('tkrh8A22NrCcKz7V', 'meeting', 'Project Kick-off Meeting', 'Started MES implementation', 'p0HdoeUhqqpPBpYa', 'oguuVTLaym6WSDYL', 'zWrK44s9C1raCnpg', '2025-12-18 09:00:00+07', 'Project Team', FALSE),
('YgzhCeuIvpDtMkvz', 'note', 'Budget Update', 'Budget increased by 20%', 'QZtyAHhywQmcH9ku', 'tgkVAVPC9GxGj6pG', 'ld7IhSBR9DKeslaj', '2025-12-22 10:00:00+07', 'Sales Manager', TRUE),
('BuL5IRS0Gf3NDwvn', 'task', 'Prepare AI Demo', 'Schedule demo for next week', '8MHierpogrPfuKtO', 'FZDqVScUixuK9DHV', 'iAWZfkWU9Ce0B7dn', '2025-12-23 14:00:00+07', 'Sales Team A', FALSE),
('uWyOqQJDyP4ZaeaN', 'call', 'Contract Renewal Confirmation', 'Kevin agreed to renewal', 'Hru6mLj0Oc0Qfwm4', 'gkU8fKhaZc0Dm3ag', 'ZjsPSKcj1O4lNURH', '2025-11-10 16:30:00+07', 'Account Manager', TRUE),
('PIqMz0IEJMeH51ZG', 'email', 'HRM Pricing Sent', 'Enterprise package quote', 'g1bNg30X2H6g32KS', 'Ub3Exi638S4tbGTL', '3Gl7ZDcBui3qq8Yf', '2025-12-08 11:00:00+07', 'Sales Team C', TRUE),
('u7Dfaqy6WUSn9sck', 'meeting', 'Distribution Requirements Discussion', 'Discussed GPS tracking needs', 'Vc1LbxKBpkj8q9Wy', 'ZLGjDJ3ATnVVAgC2', 'vztqFnkmVKxI4mFn', '2025-12-15 10:30:00+07', 'Sales Team B', TRUE),
('WoAicdaYPKJwN4RU', 'note', 'Lost Opportunity', 'Selected internal partner', 'EzKjRPkLM33PHmkX', 'eWhVBQGH02SR7PI5', 'Zlhtmrh9ObRbsyCB', '2025-10-05 17:00:00+07', 'Sales Team A', TRUE),
('8EPcKXerla1pqkmQ', 'task', '5G Project Follow-up', 'Send additional technical docs', 'q2vPke8rR1lqhNBP', '7klUuDkdD2WUbY7I', 'K0FWQRGY1SVj4P60', '2025-12-24 09:00:00+07', 'Technical Sales', FALSE),
('I7RxpmGfZaqrAObj', 'call', 'Blockchain Introduction', 'Isabella interested in traceability', 'Vc1LbxKBpkj8q9Wy', 'ZLGjDJ3ATnVVAgC2', 'GcqMKQ38feG1n2cF', '2025-12-19 15:00:00+07', 'Sales Team C', TRUE),
('Rx8E7A6ovp5N05pZ', 'email', 'Post-Demo Thank You', 'Sent slides and recording', 'XttedLE2rX5sJ2dJ', '9OfDViZjxKr71ghp', NULL, '2025-12-21 17:00:00+07', 'Sales Team A', TRUE),
('pr1FLkSuyYU55wIt', 'meeting', 'Internal Strategy Meeting', 'Discussed partnership strategy', 'EzKjRPkLM33PHmkX', '88JAdlIUVXyc6WvW', NULL, '2025-12-25 11:00:00+07', 'Internal Team', FALSE),
('HSk7GFLerlZBWMXn', 'note', 'Stage Update', 'Moved to negotiation', 'SVEGkJ3TipHaMSDJ', 'VkPMvRU5jYcM0Oet', 'fxVYciNv9IDhbuDK', '2025-12-24 16:00:00+07', 'Sales Manager', TRUE),
('pVejHIScat16TUQF', 'task', 'Contract Signing Schedule', 'Planned for next week', 'q2vPke8rR1lqhNBP', '8ZQ6wGS8murRFX3A', 'EsKn6ZnsnTVWSMVf', '2026-01-10 10:00:00+07', 'Account Manager', FALSE);