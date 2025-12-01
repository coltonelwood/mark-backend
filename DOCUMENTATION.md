# MARK Backend - Technical Documentation

## The Safe Market
**Web3 Platform for Safe Crypto Launches and Tokenized Business Raises**

Version 1.0.0 | Last Updated: 2024

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Trust Score Engine](#5-trust-score-engine)
6. [Security Architecture](#6-security-architecture)
7. [Admin Dashboard](#7-admin-dashboard)
8. [DEX & MEV Resistance](#8-dex--mev-resistance)
9. [File Structure](#9-file-structure)
10. [Deployment Guide](#10-deployment-guide)
11. [Future Blockchain Integration](#11-future-blockchain-integration)

---

## 1. Overview

MARK (The Safe Market) is a comprehensive Web3 platform designed for safe crypto launches and tokenized business raises. The platform prioritizes security, transparency, and trust through innovative features including mandatory safety checks, trust scoring, and anti-abuse protections.

### 1.1 Key Features

- **Crypto Project Launches**: Mandatory liquidity locks, team vesting, and contract scanning
- **Business Token Raises**: KYB verification, document registry, equity and revenue-share tokens
- **Trust Score Engine**: Transparent scoring system (0-100) with on-chain factors
- **Identity Verification**: Optional private KYC with accredited investor support
- **Admin Dashboard**: Complete management of projects, businesses, and applications
- **Security First**: Rate limiting, input sanitization, RBAC, and audit logging

### 1.2 Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Security**: bcrypt, AES-256-GCM encryption, rate limiting

---

## 2. Architecture

### 2.1 High-Level Architecture

The MARK backend follows a layered architecture pattern with clear separation of concerns:

- **API Layer**: Express routes handling HTTP requests and responses
- **Service Layer**: Business logic and trust score calculations
- **Middleware Layer**: Authentication, authorization, security, and logging
- **Data Layer**: Prisma ORM with PostgreSQL database

### 2.2 Request Flow

Every request goes through the following pipeline:

```
Request → Security Headers → CORS → Rate Limiting → Auth → Blocked Check → Route Handler → Response
```

### 2.3 Module Organization

| Module | Description |
|--------|-------------|
| `/api` | Route handlers for all endpoints |
| `/services` | Business logic (Auth, TrustScore) |
| `/middleware` | Request processing (auth, security) |
| `/utils` | Helpers (prisma, security, logger) |
| `/types` | TypeScript type definitions |
| `/config` | Environment configuration |

---

## 3. Database Schema

### 3.1 Core Entities

The database is designed with future blockchain integration in mind, storing all data needed for eventual on-chain migration.

#### User
- Primary account entity with email/password authentication
- Optional wallet address for crypto integration
- Roles: USER, ADMIN, SUPER_ADMIN
- Security: failed login tracking, account locking, 2FA support

#### CryptoProject
- Complete project information (name, symbol, description, category)
- Token details (type, supply, decimals)
- Safety parameters (team allocation, vesting, liquidity lock)
- Audit information (provider, report URL, verification status)
- Status workflow: DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → LIVE

#### Business
- Legal entity information (name, type, jurisdiction, EIN)
- KYB levels: NONE, BASIC, STANDARD, ENHANCED
- Tokenization parameters (equity %, revenue share %)
- Founder management with ownership tracking

#### TrustScoreEvent
- Audit trail of all trust score changes
- Links to projects or businesses
- Event types: IDENTITY_VERIFIED, LIQUIDITY_LOCKED, KYB_VERIFIED, etc.

### 3.2 Supporting Entities

- **Session**: JWT session management
- **PrivateIdentityVerification**: KYC/KYB verification status
- **ContactMessage**: User inquiries
- **LaunchApplication**: Project launch applications
- **AdminNote**: Internal admin notes
- **SystemLog**: Comprehensive audit logging
- **SecurityEvent**: Security incident tracking
- **BlockedEntity**: IP/wallet/email blocking
- **RateLimitRecord**: Rate limiting tracking
- **DexPair**: DEX trading pairs (placeholder)

---

## 4. API Endpoints

### 4.1 Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| POST | `/logout` | Logout user |
| GET | `/me` | Get current user |
| POST | `/refresh` | Refresh access token |
| POST | `/change-password` | Change password |
| POST | `/forgot-password` | Request password reset |

### 4.2 Crypto Projects (`/api/v1/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create project |
| GET | `/mine` | List user's projects |
| GET | `/:id` | Get project details |
| PATCH | `/:id` | Update project |
| POST | `/:id/submit` | Submit for review |
| DELETE | `/:id` | Delete draft project |

### 4.3 Businesses (`/api/v1/businesses`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create business |
| GET | `/mine` | List user's businesses |
| GET | `/:id` | Get business details |
| PATCH | `/:id` | Update business |
| POST | `/:id/founders` | Add founder |
| POST | `/:id/submit` | Submit for review |

### 4.4 Trust Score (`/api/v1/trust-score`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id` | Get project trust score |
| GET | `/projects/:id/history` | Get score history |
| GET | `/businesses/:id` | Get business trust score |
| GET | `/businesses/:id/history` | Get score history |
| GET | `/tiers` | Get tier definitions |

### 4.5 Identity (`/api/v1/identity`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Start verification |
| GET | `/status/:id` | Get verification status |
| GET | `/me` | Get user's verification |
| POST | `/webhook` | Provider webhook |

### 4.6 Admin (`/api/v1/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| PATCH | `/projects/:id/status` | Update project status |
| GET | `/businesses` | List all businesses |
| PATCH | `/businesses/:id/status` | Update business status |
| PATCH | `/businesses/:id/kyb` | Update KYB level |
| GET | `/contact-messages` | List messages |
| PATCH | `/contact-messages/:id` | Update message |
| GET | `/applications` | List applications |
| PATCH | `/applications/:id` | Update application |
| POST | `/trust-score/adjust` | Manual adjustment |
| GET | `/blocked` | List blocked entities |
| POST | `/blocked` | Block entity |
| DELETE | `/blocked/:id` | Unblock entity |
| GET | `/logs` | System logs (super admin) |
| GET | `/security-events` | Security events (super admin) |

---

## 5. Trust Score Engine

### 5.1 Overview

The Trust Score Engine provides transparent, on-chain-verifiable reputation scoring for all entities on the MARK platform. Scores range from 0-100 with a base score of 50.

### 5.2 Crypto Project Scoring Rules

| Factor | Points | Condition |
|--------|--------|-----------|
| Identity Verified | +20 | Team lead KYC verified |
| Liquidity Lock (6mo) | +15 | Liquidity locked 6+ months |
| Liquidity Lock (12mo) | +20 | Liquidity locked 12+ months |
| Team Vesting (12mo) | +10 | Team tokens vest 12+ months |
| Team Vesting (24mo) | +15 | Team tokens vest 24+ months |
| Complete Profile | +10 | All required fields filled |
| External Audit | +10 | Third-party audit completed |
| Whitepaper + Socials | +5 | Documentation available |
| Contract Verified | +5 | Source code verified |

### 5.3 Business Scoring Rules

| Factor | Points | Condition |
|--------|--------|-----------|
| KYB Basic | +10 | Basic verification |
| KYB Standard | +15 | Standard verification |
| KYB Enhanced | +20 | Enhanced verification |
| Financial Documents | +15 | P&L, balance sheet uploaded |
| EIN / Registration | +10 | Legal registration verified |
| Complete Profile | +10 | All required fields filled |
| Accounting Review | +10 | Third-party review |

### 5.4 Score Tiers

| Tier | Score Range | Color | Description |
|------|-------------|-------|-------------|
| EXCELLENT | 85-100 | Green | Highly Trusted |
| GOOD | 70-84 | Blue | Trusted |
| NEUTRAL | 50-69 | Gray | Standard |
| CAUTION | 30-49 | Yellow | Exercise Caution |
| HIGH_RISK | 0-29 | Red | High Risk |

### 5.5 Penalties

- **Missed Revenue Report**: -15 points
- **Community Report (verified)**: -15 points
- **Contract Flagged**: -10 points per flag
- **KYB Expired**: -25 points
- **Large Team Sale (within 30 days)**: -20 points

---

## 6. Security Architecture

### 6.1 Authentication

- JWT tokens with 7-day expiry (configurable)
- Refresh tokens with 30-day expiry
- Password requirements: 12+ chars, mixed case, numbers, special chars
- bcrypt hashing with 12 rounds
- Account lockout after 5 failed attempts (30 min)

### 6.2 Authorization

- Role-based access control (RBAC)
- Three roles: USER, ADMIN, SUPER_ADMIN
- Resource ownership validation
- Blocked entity checking (IP, wallet, email)

### 6.3 Rate Limiting

- Standard API: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- Admin endpoints: 200 requests per 15 minutes
- Per-IP and per-account tracking

### 6.4 Data Protection

- AES-256-GCM encryption for sensitive data (EIN)
- SHA-256 hashing for file integrity
- Input sanitization against XSS
- CORS with strict origin validation

### 6.5 Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### 6.6 Audit Logging

All significant actions are logged to SystemLog with:
- Level: INFO, WARN, ERROR, SECURITY, AUDIT
- Category: AUTH, PROJECT, BUSINESS, ADMIN, TRUST_SCORE, SECURITY
- User ID, IP address, request ID
- Endpoint, method, status code, response time

---

## 7. Admin Dashboard (Backend)

### 7.1 Capabilities

The admin backend provides complete management capabilities:

- View and filter all crypto projects by status, category, trust score
- View and filter all businesses by status, KYB level, industry
- Update entity statuses (PENDING → IN_REVIEW → APPROVED/REJECTED)
- Add internal notes for team communication
- Manual trust score adjustments with audit trail
- View and respond to contact messages
- Manage launch applications

### 7.2 Status Workflows

**Crypto Projects:**
```
DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → LIVE
```
Projects can also be REJECTED or PAUSED at any stage after submission.

**Businesses:**
```
DRAFT → PENDING_REVIEW → IN_REVIEW → KYB_PENDING → KYB_VERIFIED → APPROVED → LIVE
```
Businesses require KYB verification before going live.

### 7.3 Security Controls

- All admin endpoints require authentication
- Role check: ADMIN or SUPER_ADMIN
- Super admin features: blocking, system logs, security events
- All actions logged with admin ID

---

## 8. DEX & MEV Resistance (Planned)

### 8.1 Current Status

The DEX module is currently a placeholder with basic pair management. Full implementation is planned for Phase 2.

### 8.2 Planned Features

#### Anti-MEV Protections
- **Private orderflow**: Encrypted transactions until block inclusion
- **Batch auction trading**: Periodic settlement to prevent frontrunning
- **Slippage protection**: Safe defaults with configurable limits
- **Transaction throttling**: Prevent rapid-fire bot trading

#### Anti-Sniper Protections
- **Warmup window**: Configurable delay before trading goes live
- **Max buy limits**: Prevent whales from buying all supply
- **Gradual price discovery**: Auction-style initial pricing

### 8.3 Pool Types

- **Standard AMM**: For utility and governance tokens
- **Regulated Pools**: KYC-gated for equity and revenue tokens
- **OTC Desk**: For large trades with minimal price impact

### 8.4 Safety Features

- Only MARK-approved token templates allowed
- Hard-coded safety: No honeypots, no drain functions
- Mandatory liquidity lock configuration
- Trust Score displayed on all trading pairs

---

## 9. File Structure

```
mark-backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── src/
│   ├── api/               # Route handlers
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── businesses.ts
│   │   ├── trustScore.ts
│   │   ├── identity.ts
│   │   ├── contact.ts
│   │   ├── applications.ts
│   │   ├── dex.ts
│   │   └── admin.ts
│   ├── services/          # Business logic
│   │   ├── AuthService.ts
│   │   └── TrustScoreService.ts
│   ├── middleware/        # Request processing
│   │   ├── auth.ts
│   │   └── security.ts
│   ├── utils/             # Helpers
│   │   ├── prisma.ts
│   │   ├── security.ts
│   │   └── logger.ts
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   ├── config/            # Configuration
│   │   └── index.ts
│   └── index.ts           # Application entry point
├── .env.example           # Environment template
├── package.json
└── tsconfig.json
```

---

## 10. Deployment Guide

### 10.1 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for caching)

### 10.2 Installation Steps

```bash
# Clone repository
git clone https://github.com/mark/mark-backend.git
cd mark-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Initialize database
npx prisma migrate dev
npx prisma generate

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### 10.3 Environment Variables

Critical variables to configure:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: 32+ character secret for access tokens
- `JWT_REFRESH_SECRET`: 32+ character secret for refresh tokens
- `ENCRYPTION_KEY`: 32-character key for AES encryption
- `CORS_ORIGIN`: Allowed frontend origin

### 10.4 Health Check

Verify deployment with:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 11. Future MARK Blockchain Integration

### 11.1 Migration Path

The backend is designed for seamless migration to the MARK blockchain:

- All entities have blockchain-ready fields (walletAddress, txHash)
- Trust score events are structured as blockchain events
- Document hashes stored for on-chain verification
- Vesting and liquidity parameters match on-chain modules

### 11.2 Planned On-Chain Modules

| Module | Description |
|--------|-------------|
| `x/projectregistry` | Crypto project registration and management |
| `x/tokenfactory` | Token creation with safety enforcement |
| `x/safedeploy` | Contract scanning and approval |
| `x/vesting` | Token vesting schedules |
| `x/liquiditylock` | Liquidity lock enforcement |
| `x/trustscore` | On-chain trust scoring |
| `x/businessregistry` | Business entity management |
| `x/kyb` | KYB verification workflow |
| `x/equity` | Equity token management |
| `x/revenueshare` | Revenue share distribution |
| `x/exchange` | Integrated DEX |

### 11.3 Hybrid Architecture

During transition, the backend will operate in hybrid mode:

- **Off-chain**: User accounts, admin functions, document storage
- **On-chain**: Token operations, trust scores, trading
- **IBC**: Cross-chain communication with Cosmos ecosystem

### 11.4 Data Synchronization

The backend will sync with blockchain through:

- Event listeners for on-chain state changes
- Periodic indexing of blockchain data
- Real-time WebSocket updates to frontend
- Fallback to on-chain queries if DB is stale

---

## Appendix

### A. Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### B. API Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "requestId": "uuid"
}
```

### C. Bot Resistance Strategy

1. **Rate Limiting**: Progressive throttling based on behavior
2. **CAPTCHA Integration**: PoW challenges for suspicious activity
3. **Honeypot Detection**: Hidden form fields to catch bots
4. **Behavioral Analysis**: Track patterns indicating automated access
5. **IP Reputation**: Block known bad actors and proxies

### D. Governance Safety

1. **Multisig Admin Keys**: Critical operations require multiple signatures
2. **Time-Locked Upgrades**: 48-hour delay on protocol changes
3. **Emergency Pause**: Non-custodial safety mechanism
4. **Community Reporting**: Verified reports affect trust scores

---

## Contact

For questions or support, contact the MARK development team.

**Documentation version**: 1.0.0  
**Last updated**: 2024
