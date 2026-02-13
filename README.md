# School Management System API

A RESTful API for managing schools, classrooms, students, and administrators built with Node.js, Express, and MongoDB.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env: Set MONGO_URI and token secrets (32+ chars each)

# 3. Create superadmin
npm run create-superadmin

# 4. Start server
npm start          # Production
npm run dev        # Development
```

Server runs on `http://localhost:5111`

## First API Call

```bash
# Login
curl -X POST http://localhost:5111/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Use returned token
curl http://localhost:5111/api/school/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

Tests use MongoDB Memory Server (no MongoDB installation needed).

**Coverage:**
- Admin: Registration, login, authorization
- School: CRUD, soft delete, unique constraints
- Classroom: Resources, capacity, age validation
- Student: Enrollment, transfers, age checks

**Troubleshooting:**
- First run downloads MongoDB binaries (~100MB), then cached
- Tests hanging? Check for missing `await` or unclosed connections

## Key Features

- JWT authentication (long/short tokens)
- Role-based access (superadmin, school_admin)
- Soft deletes with restore
- Bulk student enrollment
- Student transfers with history
- Age-based classroom validation
- Capacity management
- PII redaction in logs

## Project Structure

```
managers/entities/    # Business logic (Admin, School, Classroom, Student)
mws/                  # Middleware (auth, validation)
tests/                # Test suite
```

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Pino logging
- Jest testing

## Documentation

**API Endpoints:** Import `postman_collection.json` into Postman for complete API documentation with examples.

## Common Issues

**MongoDB connection failed?** Check `MONGO_URI` in `.env`

**Port in use?** Change `USER_PORT` in `.env`

**Token errors?** Ensure secrets are 32+ characters

## License

ISC
