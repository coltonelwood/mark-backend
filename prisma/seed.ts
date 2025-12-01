// =============================================================================
// MARK BACKEND - DATABASE SEED
// =============================================================================
// Seeds the database with initial data for development and testing
// Run with: npm run db:seed
// =============================================================================

import { PrismaClient, UserRole, ProjectStatus, BusinessStatus, KYBLevel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ==========================================================================
  // USERS
  // ==========================================================================
  
  console.log('Creating users...');
  
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@mark.io' },
    update: {},
    create: {
      email: 'admin@mark.io',
      passwordHash,
      role: 'SUPER_ADMIN',
      displayName: 'MARK Admin',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Super Admin: ${superAdmin.email}`);

  const adminUser = await prisma.user.upsert({
    where: { email: 'reviewer@mark.io' },
    update: {},
    create: {
      email: 'reviewer@mark.io',
      passwordHash,
      role: 'ADMIN',
      displayName: 'MARK Reviewer',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Admin: ${adminUser.email}`);

  const cryptoUser = await prisma.user.upsert({
    where: { email: 'crypto@example.com' },
    update: {},
    create: {
      email: 'crypto@example.com',
      passwordHash,
      role: 'USER',
      displayName: 'Crypto Founder',
      walletAddress: 'mark1abcdefg12345678901234567890123456789',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Crypto User: ${cryptoUser.email}`);

  const businessUser = await prisma.user.upsert({
    where: { email: 'business@example.com' },
    update: {},
    create: {
      email: 'business@example.com',
      passwordHash,
      role: 'USER',
      displayName: 'Business Owner',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Business User: ${businessUser.email}`);

  // ==========================================================================
  // CRYPTO PROJECTS
  // ==========================================================================

  console.log('\nCreating crypto projects...');

  const project1 = await prisma.cryptoProject.upsert({
    where: { id: 'project-001' },
    update: {},
    create: {
      id: 'project-001',
      userId: cryptoUser.id,
      name: 'SafeSwap Protocol',
      symbol: 'SAFE',
      description: 'A decentralized exchange with built-in MEV protection and fair launch mechanics.',
      category: 'DeFi',
      website: 'https://safeswap.example.com',
      whitepaper: 'https://docs.safeswap.example.com/whitepaper.pdf',
      twitter: 'https://twitter.com/safeswap',
      discord: 'https://discord.gg/safeswap',
      telegram: 'https://t.me/safeswap',
      github: 'https://github.com/safeswap',
      tokenType: 'GOVERNANCE',
      totalSupply: '1000000000',
      decimals: 18,
      teamAllocationPercent: 15,
      teamVestingMonths: 24,
      teamCliffMonths: 6,
      vestingType: 'CLIFF_LINEAR',
      initialLiquidity: '500000',
      liquidityLockMonths: 12,
      auditProvider: 'CertiK',
      auditReportUrl: 'https://certik.com/projects/safeswap',
      status: 'LIVE',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      trustScore: 85,
      trustScoreUpdatedAt: new Date(),
      isVerified: true,
      isFeatured: true,
      launchDate: new Date(),
    },
  });
  console.log(`  ✅ Project: ${project1.name} (${project1.status})`);

  const project2 = await prisma.cryptoProject.upsert({
    where: { id: 'project-002' },
    update: {},
    create: {
      id: 'project-002',
      userId: cryptoUser.id,
      name: 'GameFi Quest',
      symbol: 'QUEST',
      description: 'Play-to-earn gaming platform with sustainable tokenomics.',
      category: 'Gaming',
      website: 'https://gamefiquest.example.com',
      twitter: 'https://twitter.com/gamefiquest',
      tokenType: 'UTILITY',
      totalSupply: '500000000',
      decimals: 18,
      teamAllocationPercent: 20,
      teamVestingMonths: 36,
      teamCliffMonths: 12,
      vestingType: 'CLIFF_LINEAR',
      initialLiquidity: '250000',
      liquidityLockMonths: 6,
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
      trustScore: 55,
    },
  });
  console.log(`  ✅ Project: ${project2.name} (${project2.status})`);

  const project3 = await prisma.cryptoProject.upsert({
    where: { id: 'project-003' },
    update: {},
    create: {
      id: 'project-003',
      userId: cryptoUser.id,
      name: 'NFT Marketplace',
      symbol: 'NFTM',
      description: 'Curated NFT marketplace for digital artists.',
      category: 'NFT',
      tokenType: 'UTILITY',
      status: 'DRAFT',
      trustScore: 50,
    },
  });
  console.log(`  ✅ Project: ${project3.name} (${project3.status})`);

  // ==========================================================================
  // BUSINESSES
  // ==========================================================================

  console.log('\nCreating businesses...');

  const business1 = await prisma.business.upsert({
    where: { id: 'business-001' },
    update: {},
    create: {
      id: 'business-001',
      userId: businessUser.id,
      legalName: 'TechStart Inc.',
      dba: 'TechStart',
      entityType: 'C-Corp',
      jurisdiction: 'Delaware',
      registrationNumber: 'DE-12345678',
      incorporationDate: new Date('2023-01-15'),
      address: '123 Innovation Way',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA',
      businessEmail: 'contact@techstart.example.com',
      businessPhone: '+1-555-123-4567',
      website: 'https://techstart.example.com',
      description: 'AI-powered SaaS platform for small business automation.',
      industry: 'Technology',
      employeeCount: 25,
      annualRevenue: '2500000',
      linkedin: 'https://linkedin.com/company/techstart',
      twitter: 'https://twitter.com/techstart',
      kybLevel: 'ENHANCED',
      kybVerifiedAt: new Date(),
      kybExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      tokenType: 'REVENUE_SHARE',
      raiseAmount: '1000000',
      revenueSharePercent: 5,
      minInvestment: '500',
      maxInvestment: '50000',
      status: 'LIVE',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      trustScore: 90,
      trustScoreUpdatedAt: new Date(),
      isVerified: true,
      isFeatured: true,
    },
  });
  console.log(`  ✅ Business: ${business1.legalName} (${business1.status})`);

  // Add founders to business
  await prisma.businessFounder.upsert({
    where: { id: 'founder-001' },
    update: {},
    create: {
      id: 'founder-001',
      businessId: business1.id,
      name: 'Jane Smith',
      role: 'CEO',
      email: 'jane@techstart.example.com',
      ownershipPercent: 40,
      linkedinUrl: 'https://linkedin.com/in/janesmith',
      kycVerified: true,
      kycVerifiedAt: new Date(),
    },
  });

  await prisma.businessFounder.upsert({
    where: { id: 'founder-002' },
    update: {},
    create: {
      id: 'founder-002',
      businessId: business1.id,
      name: 'John Doe',
      role: 'CTO',
      email: 'john@techstart.example.com',
      ownershipPercent: 30,
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      kycVerified: true,
      kycVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Added founders to ${business1.legalName}`);

  const business2 = await prisma.business.upsert({
    where: { id: 'business-002' },
    update: {},
    create: {
      id: 'business-002',
      userId: businessUser.id,
      legalName: 'Green Energy Solutions LLC',
      entityType: 'LLC',
      jurisdiction: 'Colorado',
      description: 'Residential solar panel installation and maintenance.',
      industry: 'Energy',
      employeeCount: 15,
      annualRevenue: '1200000',
      kybLevel: 'STANDARD',
      kybVerifiedAt: new Date(),
      tokenType: 'EQUITY',
      raiseAmount: '500000',
      equityPercent: 10,
      minInvestment: '1000',
      maxInvestment: '25000',
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
      trustScore: 70,
    },
  });
  console.log(`  ✅ Business: ${business2.legalName} (${business2.status})`);

  // ==========================================================================
  // IDENTITY VERIFICATIONS
  // ==========================================================================

  console.log('\nCreating identity verifications...');

  await prisma.privateIdentityVerification.upsert({
    where: { userId: cryptoUser.id },
    update: {},
    create: {
      userId: cryptoUser.id,
      status: 'VERIFIED',
      level: 'verified',
      provider: 'persona',
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✅ Identity verified for ${cryptoUser.email}`);

  await prisma.privateIdentityVerification.upsert({
    where: { userId: businessUser.id },
    update: {},
    create: {
      userId: businessUser.id,
      status: 'VERIFIED',
      level: 'verified',
      provider: 'persona',
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isAccredited: true,
    },
  });
  console.log(`  ✅ Identity verified for ${businessUser.email} (accredited)`);

  // ==========================================================================
  // CONTACT MESSAGES
  // ==========================================================================

  console.log('\nCreating contact messages...');

  await prisma.contactMessage.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      subject: 'Partnership Inquiry',
      message: 'We are interested in integrating MARK into our existing crypto platform. Can we schedule a call?',
      category: 'partnership',
      status: 'NEW',
    },
  });

  await prisma.contactMessage.create({
    data: {
      name: 'Bob Williams',
      email: 'bob@example.com',
      subject: 'Technical Support',
      message: 'Having trouble connecting my wallet. Getting error code 403.',
      category: 'support',
      status: 'IN_PROGRESS',
      assignedTo: adminUser.id,
    },
  });
  console.log(`  ✅ Created sample contact messages`);

  // ==========================================================================
  // LAUNCH APPLICATIONS
  // ==========================================================================

  console.log('\nCreating launch applications...');

  await prisma.launchApplication.create({
    data: {
      applicantName: 'Chris Lee',
      applicantEmail: 'chris@newproject.example.com',
      applicantRole: 'Founder',
      companyName: 'NewProject Labs',
      website: 'https://newproject.example.com',
      type: 'CRYPTO_LAUNCH',
      description: 'We are building a decentralized identity solution and want to launch our token on MARK.',
      raiseAmount: '2000000',
      timeline: 'Q2 2025',
      twitter: 'https://twitter.com/newproject',
      discord: 'https://discord.gg/newproject',
      referralSource: 'Twitter',
      status: 'NEW',
    },
  });

  await prisma.launchApplication.create({
    data: {
      applicantName: 'Diana Chen',
      applicantEmail: 'diana@localcafe.example.com',
      applicantRole: 'Owner',
      companyName: 'Local Cafe Chain',
      website: 'https://localcafe.example.com',
      type: 'BUSINESS_RAISE',
      description: 'Local cafe chain looking to expand to 10 new locations. Want to raise via revenue share tokens.',
      raiseAmount: '750000',
      timeline: '6 months',
      referralSource: 'Word of mouth',
      status: 'IN_REVIEW',
      reviewedBy: adminUser.id,
    },
  });
  console.log(`  ✅ Created sample launch applications`);

  // ==========================================================================
  // DEX PAIRS (Placeholder)
  // ==========================================================================

  console.log('\nCreating DEX pairs...');

  await prisma.dexPair.upsert({
    where: { id: 'pair-001' },
    update: {},
    create: {
      id: 'pair-001',
      tokenA: 'SAFE',
      tokenB: 'USDC',
      fee: 0.003,
      isActive: false,
      isRegulated: false,
    },
  });

  await prisma.dexPair.upsert({
    where: { id: 'pair-002' },
    update: {},
    create: {
      id: 'pair-002',
      tokenA: 'TECHSTART-RS',
      tokenB: 'USDC',
      fee: 0.003,
      isActive: false,
      isRegulated: true, // Requires KYC
    },
  });
  console.log(`  ✅ Created placeholder DEX pairs`);

  // ==========================================================================
  // TRUST SCORE EVENTS
  // ==========================================================================

  console.log('\nCreating trust score events...');

  await prisma.trustScoreEvent.create({
    data: {
      projectId: project1.id,
      eventType: 'IDENTITY_VERIFIED',
      points: 20,
      reason: 'Team lead completed identity verification',
      triggeredBy: 'system',
    },
  });

  await prisma.trustScoreEvent.create({
    data: {
      projectId: project1.id,
      eventType: 'LIQUIDITY_LOCKED',
      points: 20,
      reason: 'Liquidity locked for 12 months',
      triggeredBy: 'system',
    },
  });

  await prisma.trustScoreEvent.create({
    data: {
      projectId: project1.id,
      eventType: 'AUDIT_SUBMITTED',
      points: 10,
      reason: 'External audit by CertiK submitted',
      triggeredBy: 'system',
    },
  });

  await prisma.trustScoreEvent.create({
    data: {
      businessId: business1.id,
      eventType: 'KYB_VERIFIED',
      points: 20,
      reason: 'KYB ENHANCED verification completed',
      triggeredBy: 'system',
    },
  });

  await prisma.trustScoreEvent.create({
    data: {
      businessId: business1.id,
      eventType: 'DOCS_UPLOADED',
      points: 15,
      reason: 'Financial documents uploaded and verified',
      triggeredBy: 'system',
    },
  });
  console.log(`  ✅ Created trust score events`);

  // ==========================================================================
  // DONE
  // ==========================================================================

  console.log('\n✅ Database seed completed successfully!\n');
  console.log('Test accounts:');
  console.log('  Super Admin: admin@mark.io / Password123!');
  console.log('  Admin: reviewer@mark.io / Password123!');
  console.log('  Crypto User: crypto@example.com / Password123!');
  console.log('  Business User: business@example.com / Password123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
