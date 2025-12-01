// =============================================================================
// MARK BACKEND - DOCUMENTATION GENERATOR
// =============================================================================

const fs = require('fs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  LevelFormat,
  Header,
  Footer,
  PageNumber,
  PageBreak,
} = require('docx');

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  default: {
    document: {
      run: { font: 'Arial', size: 22 }, // 11pt
    },
  },
  paragraphStyles: [
    {
      id: 'Title',
      name: 'Title',
      basedOn: 'Normal',
      run: { size: 56, bold: true, color: '1E3A5F' },
      paragraph: { spacing: { before: 0, after: 240 }, alignment: AlignmentType.CENTER },
    },
    {
      id: 'Heading1',
      name: 'Heading 1',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 32, bold: true, color: '1E3A5F' },
      paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
    },
    {
      id: 'Heading2',
      name: 'Heading 2',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 26, bold: true, color: '2E5A8F' },
      paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 },
    },
    {
      id: 'Heading3',
      name: 'Heading 3',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 24, bold: true, color: '3E7ABF' },
      paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
    },
    {
      id: 'Code',
      name: 'Code',
      basedOn: 'Normal',
      run: { font: 'Consolas', size: 18, color: '333333' },
      paragraph: {
        spacing: { before: 100, after: 100 },
        shading: { fill: 'F5F5F5' },
      },
    },
  ],
};

// =============================================================================
// NUMBERING CONFIG
// =============================================================================

const numbering = {
  config: [
    {
      reference: 'bullet-list',
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: 'numbered-list',
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun(text)],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun(text)],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun(text)],
  });
}

function para(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun(text)],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullet-list', level: 0 },
    children: [new TextRun(text)],
  });
}

function code(text) {
  return new Paragraph({
    style: 'Code',
    children: [new TextRun({ text, font: 'Consolas', size: 18 })],
  });
}

function bold(text) {
  return new TextRun({ text, bold: true });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = {
  top: tableBorder,
  bottom: tableBorder,
  left: tableBorder,
  right: tableBorder,
};

function tableHeader(...cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map(
      (text) =>
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'D5E8F0', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text, bold: true })],
            }),
          ],
        })
    ),
  });
}

function tableRow(...cells) {
  return new TableRow({
    children: cells.map(
      (text) =>
        new TableCell({
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun(text)] })],
        })
    ),
  });
}

// =============================================================================
// DOCUMENT CONTENT
// =============================================================================

const sections = [
  {
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'MARK Backend Documentation', italics: true, size: 20 })],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun('Page '),
              new TextRun({ children: [PageNumber.CURRENT] }),
              new TextRun(' of '),
              new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
            ],
          }),
        ],
      }),
    },
    children: [
      // TITLE PAGE
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: 'MARK BACKEND', size: 72, bold: true, color: '1E3A5F' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Technical Documentation', size: 36, color: '666666' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The Safe Market', size: 28, italics: true, color: '888888' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Web3 Platform for Safe Crypto Launches and Tokenized Business Raises', size: 24 })],
      }),
      new Paragraph({ spacing: { before: 1000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Version 1.0.0', size: 22 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: new Date().toLocaleDateString(), size: 22 })],
      }),

      pageBreak(),

      // TABLE OF CONTENTS
      heading1('Table of Contents'),
      para('1. Overview'),
      para('2. Architecture'),
      para('3. Database Schema'),
      para('4. API Endpoints'),
      para('5. Trust Score Engine'),
      para('6. Security Architecture'),
      para('7. Admin Dashboard'),
      para('8. DEX & MEV Resistance'),
      para('9. File Structure'),
      para('10. Deployment Guide'),
      para('11. Future Blockchain Integration'),

      pageBreak(),

      // SECTION 1: OVERVIEW
      heading1('1. Overview'),
      para('MARK (The Safe Market) is a comprehensive Web3 platform designed for safe crypto launches and tokenized business raises. The platform prioritizes security, transparency, and trust through innovative features including mandatory safety checks, trust scoring, and anti-abuse protections.'),
      
      heading2('1.1 Key Features'),
      bullet('Crypto Project Launches: Mandatory liquidity locks, team vesting, and contract scanning'),
      bullet('Business Token Raises: KYB verification, document registry, equity and revenue-share tokens'),
      bullet('Trust Score Engine: Transparent scoring system (0-100) with on-chain factors'),
      bullet('Identity Verification: Optional private KYC with accredited investor support'),
      bullet('Admin Dashboard: Complete management of projects, businesses, and applications'),
      bullet('Security First: Rate limiting, input sanitization, RBAC, and audit logging'),

      heading2('1.2 Technology Stack'),
      bullet('Runtime: Node.js with TypeScript'),
      bullet('Framework: Express.js'),
      bullet('Database: PostgreSQL with Prisma ORM'),
      bullet('Authentication: JWT with refresh tokens'),
      bullet('Security: bcrypt, AES-256-GCM encryption, rate limiting'),

      pageBreak(),

      // SECTION 2: ARCHITECTURE
      heading1('2. Architecture'),
      
      heading2('2.1 High-Level Architecture'),
      para('The MARK backend follows a layered architecture pattern with clear separation of concerns:'),
      bullet('API Layer: Express routes handling HTTP requests and responses'),
      bullet('Service Layer: Business logic and trust score calculations'),
      bullet('Middleware Layer: Authentication, authorization, security, and logging'),
      bullet('Data Layer: Prisma ORM with PostgreSQL database'),

      heading2('2.2 Request Flow'),
      para('Every request goes through the following pipeline:'),
      code('Request → Security Headers → CORS → Rate Limiting → Auth → Blocked Check → Route Handler → Response'),

      heading2('2.3 Module Organization'),
      new Table({
        columnWidths: [3000, 6360],
        rows: [
          tableHeader('Module', 'Description'),
          tableRow('/api', 'Route handlers for all endpoints'),
          tableRow('/services', 'Business logic (Auth, TrustScore)'),
          tableRow('/middleware', 'Request processing (auth, security)'),
          tableRow('/utils', 'Helpers (prisma, security, logger)'),
          tableRow('/types', 'TypeScript type definitions'),
          tableRow('/config', 'Environment configuration'),
        ],
      }),

      pageBreak(),

      // SECTION 3: DATABASE SCHEMA
      heading1('3. Database Schema'),

      heading2('3.1 Core Entities'),
      para('The database is designed with future blockchain integration in mind, storing all data needed for eventual on-chain migration.'),

      heading3('User'),
      bullet('Primary account entity with email/password authentication'),
      bullet('Optional wallet address for crypto integration'),
      bullet('Roles: USER, ADMIN, SUPER_ADMIN'),
      bullet('Security: failed login tracking, account locking, 2FA support'),

      heading3('CryptoProject'),
      bullet('Complete project information (name, symbol, description, category)'),
      bullet('Token details (type, supply, decimals)'),
      bullet('Safety parameters (team allocation, vesting, liquidity lock)'),
      bullet('Audit information (provider, report URL, verification status)'),
      bullet('Status workflow: DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → LIVE'),

      heading3('Business'),
      bullet('Legal entity information (name, type, jurisdiction, EIN)'),
      bullet('KYB levels: NONE, BASIC, STANDARD, ENHANCED'),
      bullet('Tokenization parameters (equity %, revenue share %)'),
      bullet('Founder management with ownership tracking'),

      heading3('TrustScoreEvent'),
      bullet('Audit trail of all trust score changes'),
      bullet('Links to projects or businesses'),
      bullet('Event types: IDENTITY_VERIFIED, LIQUIDITY_LOCKED, KYB_VERIFIED, etc.'),

      heading2('3.2 Entity Relationships'),
      para('Key relationships in the schema:'),
      bullet('User → CryptoProject (one-to-many): A user can own multiple projects'),
      bullet('User → Business (one-to-many): A user can own multiple businesses'),
      bullet('Business → BusinessFounder (one-to-many): Businesses have multiple founders'),
      bullet('Entity → TrustScoreEvent (one-to-many): All trust score changes are logged'),

      pageBreak(),

      // SECTION 4: API ENDPOINTS
      heading1('4. API Endpoints'),

      heading2('4.1 Authentication'),
      new Table({
        columnWidths: [2000, 3000, 4360],
        rows: [
          tableHeader('Method', 'Endpoint', 'Description'),
          tableRow('POST', '/auth/register', 'Register new user'),
          tableRow('POST', '/auth/login', 'Login user'),
          tableRow('POST', '/auth/logout', 'Logout user'),
          tableRow('GET', '/auth/me', 'Get current user'),
          tableRow('POST', '/auth/refresh', 'Refresh access token'),
          tableRow('POST', '/auth/change-password', 'Change password'),
        ],
      }),

      heading2('4.2 Crypto Projects'),
      new Table({
        columnWidths: [2000, 3500, 3860],
        rows: [
          tableHeader('Method', 'Endpoint', 'Description'),
          tableRow('POST', '/projects', 'Create project'),
          tableRow('GET', '/projects/mine', 'List user projects'),
          tableRow('GET', '/projects/:id', 'Get project details'),
          tableRow('PATCH', '/projects/:id', 'Update project'),
          tableRow('POST', '/projects/:id/submit', 'Submit for review'),
          tableRow('DELETE', '/projects/:id', 'Delete draft project'),
        ],
      }),

      heading2('4.3 Businesses'),
      new Table({
        columnWidths: [2000, 3500, 3860],
        rows: [
          tableHeader('Method', 'Endpoint', 'Description'),
          tableRow('POST', '/businesses', 'Create business'),
          tableRow('GET', '/businesses/mine', 'List user businesses'),
          tableRow('GET', '/businesses/:id', 'Get business details'),
          tableRow('PATCH', '/businesses/:id', 'Update business'),
          tableRow('POST', '/businesses/:id/founders', 'Add founder'),
          tableRow('POST', '/businesses/:id/submit', 'Submit for review'),
        ],
      }),

      heading2('4.4 Trust Score'),
      new Table({
        columnWidths: [2000, 4000, 3360],
        rows: [
          tableHeader('Method', 'Endpoint', 'Description'),
          tableRow('GET', '/trust-score/projects/:id', 'Get project score'),
          tableRow('GET', '/trust-score/businesses/:id', 'Get business score'),
          tableRow('GET', '/trust-score/tiers', 'Get tier definitions'),
          tableRow('POST', '/admin/trust-score/adjust', 'Admin adjustment'),
        ],
      }),

      heading2('4.5 Admin Endpoints'),
      para('All admin endpoints require ADMIN or SUPER_ADMIN role:'),
      bullet('GET/PATCH /admin/projects - Manage all projects'),
      bullet('GET/PATCH /admin/businesses - Manage all businesses'),
      bullet('GET/PATCH /admin/contact-messages - Manage contact messages'),
      bullet('GET/PATCH /admin/applications - Manage launch applications'),
      bullet('POST /admin/blocked - Block IPs, wallets, or emails'),
      bullet('GET /admin/logs - View system logs (SUPER_ADMIN only)'),

      pageBreak(),

      // SECTION 5: TRUST SCORE ENGINE
      heading1('5. Trust Score Engine'),

      heading2('5.1 Overview'),
      para('The Trust Score Engine provides transparent, on-chain-verifiable reputation scoring for all entities on the MARK platform. Scores range from 0-100 with a base score of 50.'),

      heading2('5.2 Crypto Project Scoring Rules'),
      new Table({
        columnWidths: [5000, 2000, 2360],
        rows: [
          tableHeader('Factor', 'Points', 'Condition'),
          tableRow('Identity Verified', '+20', 'Team lead KYC verified'),
          tableRow('Liquidity Lock (6mo)', '+15', 'Liquidity locked 6+ months'),
          tableRow('Liquidity Lock (12mo)', '+20', 'Liquidity locked 12+ months'),
          tableRow('Team Vesting (12mo)', '+10', 'Team tokens vest 12+ months'),
          tableRow('Team Vesting (24mo)', '+15', 'Team tokens vest 24+ months'),
          tableRow('Complete Profile', '+10', 'All required fields filled'),
          tableRow('External Audit', '+10', 'Third-party audit completed'),
          tableRow('Whitepaper + Socials', '+5', 'Documentation available'),
          tableRow('Contract Verified', '+5', 'Source code verified'),
        ],
      }),

      heading2('5.3 Business Scoring Rules'),
      new Table({
        columnWidths: [5000, 2000, 2360],
        rows: [
          tableHeader('Factor', 'Points', 'Condition'),
          tableRow('KYB Basic', '+10', 'Basic verification'),
          tableRow('KYB Standard', '+15', 'Standard verification'),
          tableRow('KYB Enhanced', '+20', 'Enhanced verification'),
          tableRow('Financial Documents', '+15', 'P&L, balance sheet uploaded'),
          tableRow('EIN / Registration', '+10', 'Legal registration verified'),
          tableRow('Complete Profile', '+10', 'All required fields filled'),
          tableRow('Accounting Review', '+10', 'Third-party review'),
        ],
      }),

      heading2('5.4 Score Tiers'),
      new Table({
        columnWidths: [2500, 2000, 2000, 2860],
        rows: [
          tableHeader('Tier', 'Score Range', 'Color', 'Description'),
          tableRow('EXCELLENT', '85-100', 'Green', 'Highly Trusted'),
          tableRow('GOOD', '70-84', 'Blue', 'Trusted'),
          tableRow('NEUTRAL', '50-69', 'Gray', 'Standard'),
          tableRow('CAUTION', '30-49', 'Yellow', 'Exercise Caution'),
          tableRow('HIGH_RISK', '0-29', 'Red', 'High Risk'),
        ],
      }),

      heading2('5.5 Penalties'),
      bullet('Missed Revenue Report: -15 points'),
      bullet('Community Report (verified): -15 points'),
      bullet('Contract Flagged: -10 points per flag'),
      bullet('KYB Expired: -25 points'),
      bullet('Large Team Sale (within 30 days): -20 points'),

      pageBreak(),

      // SECTION 6: SECURITY ARCHITECTURE
      heading1('6. Security Architecture'),

      heading2('6.1 Authentication'),
      bullet('JWT tokens with 7-day expiry (configurable)'),
      bullet('Refresh tokens with 30-day expiry'),
      bullet('Password requirements: 12+ chars, mixed case, numbers, special chars'),
      bullet('bcrypt hashing with 12 rounds'),
      bullet('Account lockout after 5 failed attempts (30 min)'),

      heading2('6.2 Authorization'),
      bullet('Role-based access control (RBAC)'),
      bullet('Three roles: USER, ADMIN, SUPER_ADMIN'),
      bullet('Resource ownership validation'),
      bullet('Blocked entity checking (IP, wallet, email)'),

      heading2('6.3 Rate Limiting'),
      bullet('Standard API: 100 requests per 15 minutes'),
      bullet('Auth endpoints: 10 requests per 15 minutes'),
      bullet('Admin endpoints: 200 requests per 15 minutes'),
      bullet('Per-IP and per-account tracking'),

      heading2('6.4 Data Protection'),
      bullet('AES-256-GCM encryption for sensitive data (EIN)'),
      bullet('SHA-256 hashing for file integrity'),
      bullet('Input sanitization against XSS'),
      bullet('CORS with strict origin validation'),

      heading2('6.5 Security Headers'),
      code('X-Content-Type-Options: nosniff'),
      code('X-Frame-Options: DENY'),
      code('X-XSS-Protection: 1; mode=block'),
      code('Strict-Transport-Security: max-age=31536000'),
      code('Content-Security-Policy: default-src \'self\''),

      heading2('6.6 Audit Logging'),
      para('All significant actions are logged to SystemLog with:'),
      bullet('Level: INFO, WARN, ERROR, SECURITY, AUDIT'),
      bullet('Category: AUTH, PROJECT, BUSINESS, ADMIN, TRUST_SCORE, SECURITY'),
      bullet('User ID, IP address, request ID'),
      bullet('Endpoint, method, status code, response time'),

      pageBreak(),

      // SECTION 7: ADMIN DASHBOARD
      heading1('7. Admin Dashboard (Backend)'),

      heading2('7.1 Capabilities'),
      para('The admin backend provides complete management capabilities:'),
      bullet('View and filter all crypto projects by status, category, trust score'),
      bullet('View and filter all businesses by status, KYB level, industry'),
      bullet('Update entity statuses (PENDING → IN_REVIEW → APPROVED/REJECTED)'),
      bullet('Add internal notes for team communication'),
      bullet('Manual trust score adjustments with audit trail'),
      bullet('View and respond to contact messages'),
      bullet('Manage launch applications'),

      heading2('7.2 Status Workflows'),
      heading3('Crypto Projects'),
      code('DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → LIVE'),
      para('Projects can also be REJECTED or PAUSED at any stage after submission.'),

      heading3('Businesses'),
      code('DRAFT → PENDING_REVIEW → IN_REVIEW → KYB_PENDING → KYB_VERIFIED → APPROVED → LIVE'),
      para('Businesses require KYB verification before going live.'),

      heading2('7.3 Security Controls'),
      bullet('All admin endpoints require authentication'),
      bullet('Role check: ADMIN or SUPER_ADMIN'),
      bullet('Super admin features: blocking, system logs, security events'),
      bullet('All actions logged with admin ID'),

      pageBreak(),

      // SECTION 8: DEX & MEV RESISTANCE
      heading1('8. DEX & MEV Resistance (Planned)'),

      heading2('8.1 Current Status'),
      para('The DEX module is currently a placeholder with basic pair management. Full implementation is planned for Phase 2.'),

      heading2('8.2 Planned Features'),
      heading3('Anti-MEV Protections'),
      bullet('Private orderflow: Encrypted transactions until block inclusion'),
      bullet('Batch auction trading: Periodic settlement to prevent frontrunning'),
      bullet('Slippage protection: Safe defaults with configurable limits'),
      bullet('Transaction throttling: Prevent rapid-fire bot trading'),

      heading3('Anti-Sniper Protections'),
      bullet('Warmup window: Configurable delay before trading goes live'),
      bullet('Max buy limits: Prevent whales from buying all supply'),
      bullet('Gradual price discovery: Auction-style initial pricing'),

      heading2('8.3 Pool Types'),
      bullet('Standard AMM: For utility and governance tokens'),
      bullet('Regulated Pools: KYC-gated for equity and revenue tokens'),
      bullet('OTC Desk: For large trades with minimal price impact'),

      heading2('8.4 Safety Features'),
      bullet('Only MARK-approved token templates allowed'),
      bullet('Hard-coded safety: No honeypots, no drain functions'),
      bullet('Mandatory liquidity lock configuration'),
      bullet('Trust Score displayed on all trading pairs'),

      pageBreak(),

      // SECTION 9: FILE STRUCTURE
      heading1('9. File Structure'),

      code('mark-backend/'),
      code('├── prisma/'),
      code('│   ├── schema.prisma      # Database schema'),
      code('│   └── seed.ts            # Database seeding'),
      code('├── src/'),
      code('│   ├── api/               # Route handlers'),
      code('│   │   ├── auth.ts'),
      code('│   │   ├── projects.ts'),
      code('│   │   ├── businesses.ts'),
      code('│   │   ├── trustScore.ts'),
      code('│   │   ├── identity.ts'),
      code('│   │   ├── contact.ts'),
      code('│   │   ├── applications.ts'),
      code('│   │   ├── dex.ts'),
      code('│   │   └── admin.ts'),
      code('│   ├── services/          # Business logic'),
      code('│   │   ├── AuthService.ts'),
      code('│   │   └── TrustScoreService.ts'),
      code('│   ├── middleware/        # Request processing'),
      code('│   │   ├── auth.ts'),
      code('│   │   └── security.ts'),
      code('│   ├── utils/             # Helpers'),
      code('│   │   ├── prisma.ts'),
      code('│   │   ├── security.ts'),
      code('│   │   └── logger.ts'),
      code('│   ├── types/             # TypeScript definitions'),
      code('│   │   └── index.ts'),
      code('│   ├── config/            # Configuration'),
      code('│   │   └── index.ts'),
      code('│   └── index.ts           # Application entry point'),
      code('├── .env.example           # Environment template'),
      code('├── package.json'),
      code('└── tsconfig.json'),

      pageBreak(),

      // SECTION 10: DEPLOYMENT GUIDE
      heading1('10. Deployment Guide'),

      heading2('10.1 Prerequisites'),
      bullet('Node.js 18+ and npm'),
      bullet('PostgreSQL 14+'),
      bullet('Redis (optional, for caching)'),

      heading2('10.2 Installation Steps'),
      code('# Clone repository'),
      code('git clone https://github.com/mark/mark-backend.git'),
      code('cd mark-backend'),
      para(''),
      code('# Install dependencies'),
      code('npm install'),
      para(''),
      code('# Configure environment'),
      code('cp .env.example .env'),
      code('# Edit .env with your values'),
      para(''),
      code('# Initialize database'),
      code('npx prisma migrate dev'),
      code('npx prisma generate'),
      para(''),
      code('# Seed database (optional)'),
      code('npx prisma db seed'),
      para(''),
      code('# Start development server'),
      code('npm run dev'),
      para(''),
      code('# Build for production'),
      code('npm run build'),
      code('npm start'),

      heading2('10.3 Environment Variables'),
      para('Critical variables to configure:'),
      bullet('DATABASE_URL: PostgreSQL connection string'),
      bullet('JWT_SECRET: 32+ character secret for access tokens'),
      bullet('JWT_REFRESH_SECRET: 32+ character secret for refresh tokens'),
      bullet('ENCRYPTION_KEY: 32-character key for AES encryption'),
      bullet('CORS_ORIGIN: Allowed frontend origin'),

      heading2('10.4 Health Check'),
      para('Verify deployment with:'),
      code('curl http://localhost:3000/health'),

      pageBreak(),

      // SECTION 11: BLOCKCHAIN INTEGRATION
      heading1('11. Future MARK Blockchain Integration'),

      heading2('11.1 Migration Path'),
      para('The backend is designed for seamless migration to the MARK blockchain:'),
      bullet('All entities have blockchain-ready fields (walletAddress, txHash)'),
      bullet('Trust score events are structured as blockchain events'),
      bullet('Document hashes stored for on-chain verification'),
      bullet('Vesting and liquidity parameters match on-chain modules'),

      heading2('11.2 Planned On-Chain Modules'),
      new Table({
        columnWidths: [3000, 6360],
        rows: [
          tableHeader('Module', 'Description'),
          tableRow('x/projectregistry', 'Crypto project registration and management'),
          tableRow('x/tokenfactory', 'Token creation with safety enforcement'),
          tableRow('x/safedeploy', 'Contract scanning and approval'),
          tableRow('x/vesting', 'Token vesting schedules'),
          tableRow('x/liquiditylock', 'Liquidity lock enforcement'),
          tableRow('x/trustscore', 'On-chain trust scoring'),
          tableRow('x/businessregistry', 'Business entity management'),
          tableRow('x/kyb', 'KYB verification workflow'),
          tableRow('x/equity', 'Equity token management'),
          tableRow('x/revenueshare', 'Revenue share distribution'),
          tableRow('x/exchange', 'Integrated DEX'),
        ],
      }),

      heading2('11.3 Hybrid Architecture'),
      para('During transition, the backend will operate in hybrid mode:'),
      bullet('Off-chain: User accounts, admin functions, document storage'),
      bullet('On-chain: Token operations, trust scores, trading'),
      bullet('IBC: Cross-chain communication with Cosmos ecosystem'),

      heading2('11.4 Data Synchronization'),
      para('The backend will sync with blockchain through:'),
      bullet('Event listeners for on-chain state changes'),
      bullet('Periodic indexing of blockchain data'),
      bullet('Real-time WebSocket updates to frontend'),
      bullet('Fallback to on-chain queries if DB is stale'),

      pageBreak(),

      // APPENDIX
      heading1('Appendix: Quick Reference'),

      heading2('A. Status Codes'),
      new Table({
        columnWidths: [2000, 7360],
        rows: [
          tableHeader('Code', 'Meaning'),
          tableRow('200', 'Success'),
          tableRow('201', 'Created'),
          tableRow('400', 'Bad Request (validation error)'),
          tableRow('401', 'Unauthorized (not logged in)'),
          tableRow('403', 'Forbidden (insufficient permissions)'),
          tableRow('404', 'Not Found'),
          tableRow('429', 'Too Many Requests (rate limited)'),
          tableRow('500', 'Internal Server Error'),
        ],
      }),

      heading2('B. API Response Format'),
      code('// Success'),
      code('{'),
      code('  "success": true,'),
      code('  "data": { ... },'),
      code('  "meta": { "page": 1, "limit": 20, "total": 100 }'),
      code('}'),
      para(''),
      code('// Error'),
      code('{'),
      code('  "success": false,'),
      code('  "error": "Error message",'),
      code('  "requestId": "uuid"'),
      code('}'),

      heading2('C. Contact'),
      para('For questions or support, contact the MARK development team.'),
      para('Documentation version: 1.0.0'),
      para('Last updated: ' + new Date().toLocaleDateString()),
    ],
  },
];

// =============================================================================
// GENERATE DOCUMENT
// =============================================================================

const doc = new Document({
  styles,
  numbering,
  sections,
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('/home/claude/mark-backend/MARK-Backend-Documentation.docx', buffer);
  console.log('✅ Documentation generated: MARK-Backend-Documentation.docx');
});
