```mermaid
erDiagram
    User ||--o{ CryptoProject : owns
    User ||--o{ Business : owns
    User ||--o| PrivateIdentityVerification : has
    User ||--o{ Session : has
    User ||--o{ ContactMessage : sends
    User ||--o{ LaunchApplication : submits
    User ||--o{ AdminNote : creates
    
    CryptoProject ||--o{ ProjectDocument : has
    CryptoProject ||--o{ TrustScoreEvent : receives
    CryptoProject ||--o{ AdminNote : has
    
    Business ||--o{ BusinessFounder : has
    Business ||--o{ BusinessDocument : has
    Business ||--o{ RevenueReport : submits
    Business ||--o{ TrustScoreEvent : receives
    Business ||--o{ AdminNote : has
    
    ContactMessage ||--o{ AdminNote : has
    LaunchApplication ||--o{ AdminNote : has
    
    User {
        string id PK
        string email UK
        string passwordHash
        string walletAddress UK
        UserRole role
        boolean isActive
        datetime createdAt
    }
    
    CryptoProject {
        string id PK
        string userId FK
        string name
        string symbol
        ProjectStatus status
        int trustScore
        TokenType tokenType
        int liquidityLockMonths
        int teamVestingMonths
    }
    
    Business {
        string id PK
        string userId FK
        string legalName
        BusinessStatus status
        KYBLevel kybLevel
        int trustScore
        TokenType tokenType
    }
    
    BusinessFounder {
        string id PK
        string businessId FK
        string name
        string role
        float ownershipPercent
        boolean kycVerified
    }
    
    TrustScoreEvent {
        string id PK
        string projectId FK
        string businessId FK
        TrustScoreEventType eventType
        int points
        string reason
    }
    
    PrivateIdentityVerification {
        string id PK
        string userId FK UK
        IdentityStatus status
        string level
        datetime verifiedAt
        boolean isAccredited
    }
    
    Session {
        string id PK
        string userId FK
        string token UK
        string refreshToken UK
        datetime expiresAt
        boolean isRevoked
    }
    
    SystemLog {
        string id PK
        LogLevel level
        LogCategory category
        string action
        string message
        string userId FK
        datetime createdAt
    }
    
    DexPair {
        string id PK
        string tokenA
        string tokenB
        boolean isRegulated
        float fee
    }
```

## Entity Legend

### Core Entities
- **User**: Platform accounts with email/wallet auth
- **CryptoProject**: Crypto token launches with safety requirements
- **Business**: Legal entities for tokenized raises

### Safety Entities
- **TrustScoreEvent**: Audit trail of score changes
- **PrivateIdentityVerification**: KYC status (private, metadata only)

### Supporting Entities
- **Session**: JWT session management
- **SystemLog**: Comprehensive audit logging
- **DexPair**: DEX trading pairs (placeholder)

## Relationships

1. **User → Projects/Businesses**: One-to-many ownership
2. **Business → Founders**: One-to-many team members
3. **Entity → TrustScoreEvents**: One-to-many score history
4. **User → Identity**: One-to-one verification status

## Status Flows

### CryptoProject Status
```
DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → LIVE
                                   ↘ REJECTED
                                     PAUSED (from any)
```

### Business Status
```
DRAFT → PENDING_REVIEW → IN_REVIEW → KYB_PENDING → KYB_VERIFIED → APPROVED → LIVE
                                                                ↘ REJECTED
```

### KYB Levels
```
NONE → BASIC (memberships) → STANDARD (revenue tokens) → ENHANCED (equity)
```
