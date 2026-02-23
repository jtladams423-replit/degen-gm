# Database Migration Strategy

## Overview
This project uses Drizzle ORM with drizzle-kit for database schema management.

## Commands

### Development
- `npm run db:push` - Push schema changes directly (development only, may cause data loss)
- `npx drizzle-kit studio` - Open Drizzle Studio to browse/edit data

### Production
- `npx drizzle-kit generate` - Generate SQL migration files from schema changes
- `npx drizzle-kit migrate` - Run pending migrations against the database

## Workflow

### Making Schema Changes
1. Edit `shared/schema.ts` with your changes
2. Generate migration: `npx drizzle-kit generate`
3. Review generated SQL in `migrations/` directory
4. Apply migration: `npx drizzle-kit migrate`

### Development vs Production
- **Development**: Use `npm run db:push` for quick iteration
- **Production**: Always use `npx drizzle-kit generate` + `npx drizzle-kit migrate` for safe, reversible changes

### Rollback
Drizzle migrations are forward-only. To rollback:
1. Write a new migration that reverses the changes
2. Or restore from a database backup

## Schema Location
All database schema definitions are in `shared/schema.ts`.
