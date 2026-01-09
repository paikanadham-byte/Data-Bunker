# Data Bunker - Global Company Search Platform

A web application for finding and displaying active companies from around the globe using public, legal data sources.

## Overview

Data Bunker enables users to:
- Search for companies by name, location, or industry
- Filter by country → state/province → city
- View company details (name, registration number, address, status, industry)
- Explore public company information from multiple sources
- Save favorite companies locally

## Quick Start

### 1. Get API Keys

- **Companies House**: https://developer.companieshouse.gov.uk/
- **OpenCorporates**: https://opencorporates.com/api

### 2. Configure Environment

**backend/.env**
```
PORT=5000
COMPANIES_HOUSE_API_KEY=your_key_here
OPENCORPORATES_API_KEY=your_key_here
NODE_ENV=development
```

### 3. Install & Run

**Option 1: Run both servers together (Recommended)**
```bash
# Install all dependencies
npm run install:all

# Run both backend and frontend dev servers
npm run dev
```

**Option 2: Run servers separately**
```bash
# Backend (terminal 1)
cd backend && npm install && npm run dev

# Frontend (terminal 2)
cd frontend && npm install && npm start
```

Visit `http://localhost:3000` (Frontend)  
Backend API: `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start both backend and frontend dev servers
- `npm run dev:backend` - Start only backend dev server
- `npm run dev:frontend` - Start only frontend dev server
- `npm run install:all` - Install dependencies for root, backend, and frontend
- `npm test` - Run backend tests

## Features (MVP)

✅ Company search by name & location  
✅ Filter by country → state → city  
✅ Company details display  
✅ Companies House integration (UK)  
✅ Rate limiting & caching  

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React.js + Axios
- **APIs**: Companies House, OpenCorporates, SEC EDGAR
- **Hosting**: Replit/Vercel/Render

## Documentation

- [API Sources](docs/API_SOURCES.md) - Detailed API reference
- [Development](docs/DEVELOPMENT.md) - Adding countries & sources
- [Deployment](docs/DEPLOYMENT.md) - Production setup

## Roadmap

- **Phase 1**: UK MVP (Companies House)
- **Phase 2**: Global (OpenCorporates + 20 countries)
- **Phase 3**: Advanced (accounts, exports, analytics)
