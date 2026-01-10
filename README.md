# 🗄️ Data Bunker - Global Company Search Platform

[![Status](https://img.shields.io/badge/status-production-green.svg)]()
[![Database](https://img.shields.io/badge/companies-4M+-blue.svg)]()
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-orange.svg)]()

> **Search 4+ million UK companies with intelligent enrichment and verification**

## 🚀 Quick Start

### One-Command Startup
```bash
./start-all.sh
```

This automatically:
- ✅ Starts PostgreSQL database (always running)
- ✅ Starts backend API server (port 5000)
- ✅ Starts frontend React app (port 3000)
- ✅ Resumes enrichment workers (if queue has jobs)

**Open**: http://localhost:3000

### Stop Services
```bash
./stop-all.sh  # Stops frontend, backend, workers (keeps database running)
```

## 📊 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ Running | 4,047,095 companies (always connected) |
| **Backend** | ✅ Ready | http://localhost:5000/api |
| **Frontend** | ✅ Ready | http://localhost:3000 |
| **Enriched** | 84 companies | 56 with emails |
| **Queue** | 11,780 pending | 15 workers active |

## 🔧 Key Features

1. **Never Disconnects** - Database with `restart: always` policy
2. **Auto-Recovery** - Health checks every 10s
3. **Smart Enrichment** - 50-point verification system
4. **Parallel Workers** - 15 concurrent processors
5. **Fast Search** - 20ms for 20 results from 4M companies

## 📁 Essential Files

```
Data-Bunker/
├── start-all.sh              ← Start everything
├── stop-all.sh               ← Stop services
├── health-check.sh           ← Auto-restart monitor
├── docker-compose.simple.yml ← Database config
│
├── backend/
│   ├── server.js
│   ├── start-workers.sh
│   └── src/
│       ├── routes/
│       │   ├── database.js           # Search API
│       │   ├── enrichment-simple.js  # Enrichment
│       │   └── officers.js           # Officers
│       └── services/
│           ├── simpleEnrichmentService.js
│           └── webScraperService.js
│
└── frontend/
    └── src/
        ├── pages/SearchPage.js
        └── components/
```

## 🔌 API Quick Reference

```bash
# Search
GET /api/db/search?country=gb&limit=20

# Enrichment stats
GET /api/enrichment/stats

# Queue jobs
POST /api/enrichment/queue
{"limit": 1000, "priority": 10}
```

## 🛠️ Maintenance

### Check Status
```bash
curl http://localhost:5000/api/enrichment/stats | jq
```

### View Logs
```bash
tail -f /tmp/data-bunker-backend.log
tail -f /tmp/enrichment-workers.log
```

### Backup Database
```bash
docker exec data-bunker-db pg_dump -U postgres databunker > backup.sql
```

## ⚠️ Troubleshooting

All issues? Run:
```bash
./stop-all.sh && ./start-all.sh
```

Database issues?
```bash
docker-compose -f docker-compose.simple.yml up -d
```

---

**Version**: 2.0 | **Last Updated**: Jan 7, 2026 | **Status**: ✅ Operational
