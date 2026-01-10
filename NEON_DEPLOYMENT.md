# Neon Database Deployment Guide

## ✅ Migration Status

**All data successfully migrated to Neon PostgreSQL!**

- ✅ 4,047,153 companies
- ✅ 2,000,000 accounts
- ✅ 16,142 officers
- ✅ 11,826 enrichment queue items
- ✅ 59 search logs

## Database Connection

**Neon Database URL:**
```
postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Quick Start

### 1. Test Connection
```bash
cd backend
node test-neon.js
```

### 2. Check Database Status
```bash
cd backend
node scripts/check-neon-status.js
```

### 3. Run Application with Neon
The application is already configured to use Neon through the `.env` file.

```bash
# Development
cd backend
npm start

# Or with Docker (Production)
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration Files

### Backend Environment Variables
The `.env` file in `/backend` is already configured:

```env
DATABASE_URL=postgresql://neondb_owner:...@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
DB_HOST=ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_kPZpR7iBLnj5
DB_SSL=true
```

### Docker Compose
- `docker-compose.yml` - Development (includes local PostgreSQL)
- `docker-compose.prod.yml` - Production (uses Neon, no local DB)

## Deployment Options

### Option 1: Docker (Recommended)

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

### Option 2: Direct Node.js

```bash
cd backend
npm install
npm start
```

### Option 3: Cloud Platforms

#### Deploy to Heroku
```bash
# Install Heroku CLI
heroku create your-app-name

# Set environment variables
heroku config:set DATABASE_URL="postgresql://neondb_owner:..."
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

#### Deploy to Railway
1. Connect GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

#### Deploy to Render
1. Create new Web Service
2. Connect GitHub repository
3. Set environment variables
4. Deploy

## Environment Variables for Production

Copy `.env.production.template` to `.env.production` and update:

```bash
# Required
DATABASE_URL=your_neon_connection_string
COMPANIES_HOUSE_API_KEY=your_key
OPENCORPORATES_API_KEY=your_key
GSA_API_KEY=your_key

# Optional
CORS_ORIGIN=https://yourdomain.com
REACT_APP_API_URL=https://api.yourdomain.com
```

## Monitoring & Maintenance

### Check Database Health
```bash
node backend/scripts/check-neon-status.js
```

### View Neon Dashboard
1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project "ep-fancy-flower-a4ntmd3k"
3. Monitor:
   - Connection count
   - Query performance
   - Storage usage
   - Activity logs

### Database Backups
Neon provides automatic backups. To create manual backup:

```bash
# Export full database
pg_dump "postgresql://neondb_owner:...@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-fancy-flower-a4ntmd3k" > backup.sql

# Restore if needed
psql "postgresql://..." < backup.sql
```

## Scaling Considerations

### Neon Auto-Scaling
- Neon automatically scales compute based on demand
- Default: 0.25 - 4 vCPU auto-scaling
- Storage: Grows automatically with data

### Connection Pooling
The app uses connection pooling (max: 20 connections):
- Adjust in `backend/src/db/connection.js`
- Neon pooler endpoint already configured

### Performance Tips
1. **Use connection pooler endpoint** (already configured)
2. **Monitor query performance** in Neon dashboard
3. **Add indexes** for frequently queried columns
4. **Optimize batch operations** for bulk imports

## Troubleshooting

### Connection Issues
```bash
# Test connection
psql "postgresql://neondb_owner:...@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-fancy-flower-a4ntmd3k"

# Check if SSL is enabled
echo $DB_SSL  # Should be 'true'
```

### SSL/TLS Errors
Ensure your connection includes:
- `sslmode=require` in connection string
- `ssl: { rejectUnauthorized: false }` in Node.js config

### Performance Issues
- Check Neon dashboard for connection limits
- Review slow query logs
- Consider upgrading Neon plan if needed

## Migration Scripts (For Reference)

All migration scripts are in `backend/scripts/`:
- `migrate-to-neon.js` - Full migration with batching
- `fast-migrate-to-neon.sh` - Shell script using pg_dump
- `clean-migrate-to-neon.sh` - Clean migration
- `simple-migrate.js` - Simple table-by-table migration
- `migrate-remaining-tables.js` - Migrate specific tables
- `check-neon-status.js` - Check current data status

## Next Steps

1. ✅ Data migrated to Neon
2. ✅ Environment configured
3. ✅ Docker Compose ready
4. 🔄 Test the application
5. 🔄 Deploy to production
6. 🔄 Set up monitoring
7. 🔄 Configure domain and SSL

## Support

- **Neon Docs:** https://neon.tech/docs
- **Neon Support:** support@neon.tech
- **Project Issues:** GitHub Issues

---

**Migration completed:** January 8, 2026
**Database:** Neon PostgreSQL (Project: ep-fancy-flower-a4ntmd3k)
**Status:** ✅ Ready for Production
