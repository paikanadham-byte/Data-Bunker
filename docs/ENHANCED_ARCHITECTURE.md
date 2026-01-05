# Global Business Database - Enhanced Architecture

## 📊 System Overview

**Objective**: Aggregate all active companies globally with complete contact and location details, updated automatically.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        React/Vue Frontend                        │
│  ├─ Advanced Filters (Location, Industry, Status, Date)         │
│  ├─ Search & Discovery                                          │
│  ├─ Data Export (CSV/Excel)                                     │
│  └─ Company Detail Views                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js/FastAPI Backend                    │
│  ├─ REST API Endpoints                                          │
│  ├─ Data Validation & Cleaning                                  │
│  ├─ Export Service (CSV/Excel)                                  │
│  ├─ Authentication & Rate Limiting                              │
│  └─ Job Scheduler (Company Discovery)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Data Cache  │  │   Logger     │  │ Job Queue    │
│  (Redis)     │  │  (Winston)   │  │ (Celery)     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                               │
        ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Aggregation Pipeline                      │
│  ├─ Companies House API                                         │
│  ├─ OpenCorporates API                                          │
│  ├─ Clearbit API                                                │
│  ├─ Crunchbase API                                              │
│  ├─ Government Registries                                       │
│  ├─ LinkedIn Scraper                                            │
│  └─ Web Crawlers                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Primary)                       │
│                                                                  │
│  ├─ Countries (Code, Name, Region)                             │
│  ├─ States (Country_ID, Code, Name)                            │
│  ├─ Cities (State_ID, Name, Coordinates)                       │
│  ├─ Districts (City_ID, Name)                                  │
│  ├─ Companies (All fields - see below)                         │
│  ├─ Contacts (Email, Phone, LinkedIn, Type)                    │
│  ├─ Contact_Validations (Email/Phone validation status)        │
│  ├─ Company_History (Track changes & creation dates)           │
│  ├─ Data_Sources (Track which source added the data)           │
│  └─ Update_Log (Audit trail for all changes)                   │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Database Schema

### 1. **Geographic Hierarchy**

```sql
-- Countries (Base of hierarchy)
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- States/Provinces
CREATE TABLE states (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country_id, code)
);

-- Cities
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  state_id INTEGER REFERENCES states(id),
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  population INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_state_id (state_id),
  INDEX idx_name (name)
);

-- Districts (Sub-city level)
CREATE TABLE districts (
  id SERIAL PRIMARY KEY,
  city_id INTEGER REFERENCES cities(id),
  name VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city_id (city_id),
  UNIQUE(city_id, name)
);
```

### 2. **Company Core Data**

```sql
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  
  -- Identifiers
  registration_number VARCHAR(50) NOT NULL,
  company_number VARCHAR(100) UNIQUE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  description TEXT,
  
  -- Location (Hierarchical)
  country_id INTEGER NOT NULL REFERENCES countries(id),
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  district_id INTEGER REFERENCES districts(id),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  postal_code VARCHAR(20),
  coordinates_lat DECIMAL(10, 8),
  coordinates_lon DECIMAL(11, 8),
  
  -- Business Details
  industry VARCHAR(100),
  industry_category VARCHAR(50),
  sub_industry VARCHAR(100),
  sic_code VARCHAR(10),
  nace_code VARCHAR(10),
  company_size VARCHAR(50), -- e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
  
  -- Company Status
  status VARCHAR(20) NOT NULL, -- 'active', 'inactive', 'dissolved', 'dormant'
  status_updated_at TIMESTAMP,
  
  -- Dates
  created_date DATE,
  incorporation_date DATE,
  dissolution_date DATE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Data Quality
  data_quality_score DECIMAL(3, 2), -- 0-1 score
  verification_status VARCHAR(20), -- 'verified', 'unverified', 'needs_update'
  last_verified TIMESTAMP,
  
  -- URLs
  website VARCHAR(255),
  linkedin_url VARCHAR(255),
  crunchbase_url VARCHAR(255),
  
  -- Financial (optional)
  annual_revenue BIGINT,
  employee_count INTEGER,
  
  -- Metadata
  source_data_feed VARCHAR(50), -- 'companies_house', 'opencorporates', 'clearbit', etc
  source_urls TEXT[], -- Array of source URLs
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_country_state_city (country_id, state_id, city_id),
  INDEX idx_status (status),
  INDEX idx_created_date (created_date),
  INDEX idx_industry (industry),
  INDEX idx_name (name),
  UNIQUE(country_id, registration_number)
);
```

### 3. **Contact Data**

```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Contact Info
  email VARCHAR(255),
  phone VARCHAR(20),
  phone_formatted VARCHAR(20),
  linkedin_profile_url VARCHAR(500),
  linkedin_profile_id VARCHAR(100),
  
  -- Contact Details
  contact_name VARCHAR(200),
  job_title VARCHAR(200),
  department VARCHAR(100),
  contact_type VARCHAR(50), -- 'general', 'sales', 'hr', 'cto', 'ceo', 'legal'
  
  -- Validation Status
  email_verified BOOLEAN DEFAULT false,
  email_valid_status VARCHAR(20), -- 'valid', 'invalid', 'unverified', 'bounce'
  phone_verified BOOLEAN DEFAULT false,
  phone_valid_status VARCHAR(20), -- 'valid', 'invalid', 'unverified'
  verification_date TIMESTAMP,
  
  -- Metadata
  source VARCHAR(50), -- 'clearbit', 'crunchbase', 'linkedin', 'company_website', 'manual'
  confidence_score DECIMAL(3, 2), -- 0-1
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_company_id (company_id),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_contact_type (contact_type)
);
```

### 4. **Data Audit & History**

```sql
-- Track all company updates
CREATE TABLE company_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  -- Change tracking
  field_changed VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  
  -- Source
  source VARCHAR(50),
  change_reason VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_company_id (company_id),
  INDEX idx_created_at (created_at)
);

-- Data source tracking
CREATE TABLE data_sources (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  source_name VARCHAR(100), -- 'companies_house', 'opencorporates', 'clearbit', etc
  source_entity_id VARCHAR(255), -- ID in source system
  source_url VARCHAR(500),
  
  last_fetched TIMESTAMP,
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(company_id, source_name),
  INDEX idx_company_id (company_id)
);

-- Update tracking
CREATE TABLE update_log (
  id SERIAL PRIMARY KEY,
  
  -- Operation details
  operation_type VARCHAR(50), -- 'insert', 'update', 'delete', 'scrape'
  entity_type VARCHAR(50), -- 'company', 'contact', 'location'
  entity_id INTEGER,
  
  -- Source & Status
  data_source VARCHAR(50),
  status VARCHAR(20), -- 'success', 'failed', 'partial'
  error_message TEXT,
  
  -- Counts
  records_processed INTEGER,
  records_succeeded INTEGER,
  records_failed INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### 5. **Email/Phone Validation**

```sql
CREATE TABLE contact_validations (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Email Validation
  email_status VARCHAR(20), -- 'valid', 'invalid', 'disposable', 'role', 'unverified'
  email_validation_date TIMESTAMP,
  email_validation_source VARCHAR(50), -- 'hunter', 'clearbit', 'neverbounce', etc
  
  -- Phone Validation
  phone_status VARCHAR(20), -- 'valid', 'invalid', 'unverified'
  phone_validation_date TIMESTAMP,
  phone_validation_source VARCHAR(50),
  
  -- Metadata
  validation_confidence DECIMAL(3, 2),
  next_validation_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_contact_id (contact_id)
);
```

## 🔄 Data Aggregation Pipeline

### Integration Points

```
1. Official Registries
   ├─ Companies House (UK)
   ├─ SEC EDGAR (USA)
   ├─ BvD (Europe)
   └─ ASIC (Australia)

2. Commercial APIs
   ├─ Clearbit (Company enrichment)
   ├─ Crunchbase (Startup data)
   ├─ Hunter.io (Email finding)
   └─ RocketReach (Contact data)

3. Social/Professional Networks
   ├─ LinkedIn API (Company profiles)
   ├─ Twitter API (Company accounts)
   └─ Web scraping (Public websites)

4. Government Feeds
   ├─ Open Data Portals
   ├─ Business Registration Feeds
   └─ Official Gazette feeds
```

### Data Flow

```
Raw Data Input
    ↓
Data Validation & Cleaning
    ↓
Deduplication (check if company exists)
    ↓
Contact Extraction & Validation
    ↓
Location Standardization
    ↓
Data Enrichment (merge with existing records)
    ↓
Database Insert/Update
    ↓
Audit Logging
    ↓
Quality Scoring
    ↓
Notification (if new company detected)
```

## 🚀 Key Features

### 1. **Hierarchical Filtering**
- Country → State → City → District → Company
- All levels cached for quick access

### 2. **Advanced Search**
- By company name, registration number, industry
- By location (any level of hierarchy)
- By status and creation date range

### 3. **Contact Management**
- Email and phone validation
- LinkedIn profile linking
- Contact deduplication
- Primary contact designation

### 4. **Data Quality**
- Quality score (0-1) for each company
- Verification status tracking
- Source tracking (which API added this)
- Last verified timestamp

### 5. **Automatic Updates**
- Scheduled jobs for new company discovery
- Background processing queue
- Error handling & retry logic
- Update notifications

### 6. **Export Capabilities**
- CSV export with custom columns
- Excel export with multiple sheets
- Filtered dataset export
- Scheduled batch exports

## 📈 Scalability Strategy

### Phase 1: Foundation (Months 1-2)
- Single PostgreSQL instance
- Basic API integrations (Companies House, OpenCorporates)
- 100K-1M companies
- Manual data feeds

### Phase 2: Scale (Months 3-4)
- PostgreSQL replication
- Redis caching layer
- 5M-10M companies
- Automated update jobs

### Phase 3: Global (Months 5-6)
- Distributed database
- Multiple data sources
- 50M+ companies
- Real-time updates

### Phase 4: Enterprise (Months 7+)
- Sharded database
- Machine learning for duplicate detection
- 100M+ companies
- Advanced analytics

## 🔐 Security Considerations

- API key management (environment variables)
- Rate limiting per source
- Data privacy compliance (GDPR, CCPA)
- Access control & authentication
- Audit logging for all changes
- Contact data encryption

## 📊 Performance Targets

- Company lookup: <100ms
- Contact fetch: <200ms
- Export 1M records: <5 minutes
- Update 10K companies: <1 minute
- Daily new company discovery: <1 hour

This forms the foundation for a global, scalable business database platform.
