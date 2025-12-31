import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROJECT_ID = 'f900d3f1-400c-41c5-a88c-fbbdfe4ce4f9'; // Test Project

async function main() {
  console.log('Seeding demo data for API project...\n');

  // 1. Update project details
  console.log('1. Updating project details...');
  await prisma.project.update({
    where: { id: PROJECT_ID },
    data: {
      name: 'PaymentGateway API',
      description: 'A comprehensive payment processing API that handles transactions, refunds, subscriptions, and merchant management. Built for high availability and PCI-DSS compliance.',
      jiraProjectKey: 'PGAPI',
      settings: {
        defaultAcFormat: 'gherkin',
        defaultSize: 'M',
        autoApproveMinor: false,
      },
    },
  });

  // 2. Create project knowledge (brief)
  console.log('2. Creating project brief...');
  await prisma.projectKnowledge.upsert({
    where: { projectId: PROJECT_ID },
    update: {
      brief: `# PaymentGateway API

## Overview
PaymentGateway is a RESTful API service that enables merchants to process payments, manage subscriptions, and handle refunds. The system is designed for high availability (99.99% uptime SLA) and processes over 10,000 transactions per second at peak.

## Goals
- Provide a simple, developer-friendly API for payment processing
- Ensure PCI-DSS Level 1 compliance for all card data handling
- Support multiple payment methods (cards, bank transfers, digital wallets)
- Enable real-time webhooks for transaction status updates
- Maintain sub-100ms response times for payment authorization

## Architecture
- Microservices architecture with event-driven communication
- PostgreSQL for transactional data, Redis for caching
- Kubernetes deployment on AWS EKS
- API Gateway (Kong) for rate limiting and authentication

## Key Stakeholders
- **Product Owner**: Sarah Chen
- **Tech Lead**: Marcus Johnson
- **Security Lead**: Emily Watson

## Timeline
- Phase 1 (MVP): Q1 2025 - Core payment processing
- Phase 2: Q2 2025 - Subscriptions and recurring payments
- Phase 3: Q3 2025 - Advanced fraud detection`,
      briefUpdatedAt: new Date(),
    },
    create: {
      projectId: PROJECT_ID,
      brief: `# PaymentGateway API

## Overview
PaymentGateway is a RESTful API service that enables merchants to process payments, manage subscriptions, and handle refunds.

## Goals
- Simple, developer-friendly API
- PCI-DSS Level 1 compliance
- Multiple payment methods support
- Real-time webhooks
- Sub-100ms response times`,
      briefUpdatedAt: new Date(),
    },
  });

  // 3. Create glossary terms
  console.log('3. Creating glossary terms...');
  const glossaryTerms = [
    { term: 'PCI-DSS', definition: 'Payment Card Industry Data Security Standard - A security standard for organizations that handle credit card data.', category: 'Compliance' },
    { term: 'Idempotency Key', definition: 'A unique identifier sent with a request to ensure the same operation is not performed twice. Used to safely retry failed requests.', category: 'API Concepts' },
    { term: 'Payment Intent', definition: 'An object that represents a payment lifecycle from creation to completion. Tracks the state of a payment attempt.', category: 'Domain' },
    { term: 'Webhook', definition: 'An HTTP callback that notifies your system when events occur (e.g., payment completed, refund processed).', category: 'API Concepts' },
    { term: 'Merchant', definition: 'A business entity registered in the system that can process payments. Each merchant has a unique ID and API credentials.', category: 'Domain' },
    { term: 'Tokenization', definition: 'The process of replacing sensitive card data with a non-sensitive token that can be safely stored and transmitted.', category: 'Security' },
    { term: 'Settlement', definition: 'The process of transferring funds from the acquiring bank to the merchant account, typically 1-3 business days after authorization.', category: 'Domain' },
    { term: 'Chargeback', definition: 'A reversal of a credit card payment initiated by the cardholder\'s bank, usually due to fraud or disputes.', category: 'Domain' },
    { term: '3D Secure', definition: 'An authentication protocol that adds an extra layer of security for online card payments (e.g., Verified by Visa).', category: 'Security' },
    { term: 'API Key', definition: 'A secret credential used to authenticate API requests. Must be kept secure and never exposed in client-side code.', category: 'Security' },
  ];

  for (const term of glossaryTerms) {
    await prisma.glossaryTerm.upsert({
      where: { projectId_term: { projectId: PROJECT_ID, term: term.term } },
      update: { definition: term.definition, category: term.category },
      create: { projectId: PROJECT_ID, ...term },
    });
  }

  // 4. Create preferences config
  console.log('4. Creating preferences config...');
  await prisma.teamPreferencesConfig.upsert({
    where: { projectId: PROJECT_ID },
    update: {
      acFormat: 'gherkin',
      requiredSections: ['API Endpoint', 'Request/Response', 'Error Handling', 'Security'],
      maxAcCount: 8,
      verbosity: 'balanced',
      technicalDepth: 'implementation',
      customPrefs: [
        'Always include HTTP status codes in acceptance criteria',
        'Include rate limiting considerations for public endpoints',
        'Reference PCI-DSS requirements for card data handling',
        'Include idempotency key handling for POST/PUT operations',
      ],
    },
    create: {
      projectId: PROJECT_ID,
      acFormat: 'gherkin',
      requiredSections: ['API Endpoint', 'Request/Response', 'Error Handling', 'Security'],
      maxAcCount: 8,
      verbosity: 'balanced',
      technicalDepth: 'implementation',
      customPrefs: [
        'Always include HTTP status codes in acceptance criteria',
        'Include rate limiting considerations for public endpoints',
      ],
    },
  });

  // 5. Create a spec
  console.log('5. Creating spec...');
  const spec = await prisma.spec.upsert({
    where: { id: 'spec-payment-api-v1' },
    update: {},
    create: {
      id: 'spec-payment-api-v1',
      projectId: PROJECT_ID,
      name: 'Payment API v1.0 Specification',
      filePath: '/uploads/payment-api-spec.yaml',
      fileType: 'yaml',
      fileSize: 45000,
      status: 'translated',
      specType: 'api-spec',
      uploadedBy: 'user-001',
      extractedText: `# Payment API Specification v1.0

## 1. Overview
This document describes the PaymentGateway REST API for processing payments.

## 2. Authentication
All API requests must include an API key in the Authorization header.

## 3. Endpoints

### 3.1 Create Payment
POST /v1/payments
Creates a new payment intent.

### 3.2 Capture Payment
POST /v1/payments/{id}/capture
Captures an authorized payment.

### 3.3 Refund Payment
POST /v1/refunds
Creates a refund for a payment.

### 3.4 List Transactions
GET /v1/transactions
Lists all transactions for a merchant.

## 4. Webhooks
Configure webhooks to receive real-time notifications.

## 5. Error Handling
Standard error response format with codes.`,
      metadata: {
        version: '1.0',
        author: 'API Team',
        lastModified: '2025-01-15',
      },
    },
  });

  // 6. Create spec sections
  console.log('6. Creating spec sections...');
  const sections = [
    { sectionRef: '1', heading: 'Overview', content: 'This document describes the PaymentGateway REST API for processing payments, refunds, and managing subscriptions.', orderIndex: 0 },
    { sectionRef: '2', heading: 'Authentication', content: 'All API requests must include an API key in the Authorization header using Bearer token format. API keys can be generated from the merchant dashboard.', orderIndex: 1 },
    { sectionRef: '3.1', heading: 'Create Payment', content: 'POST /v1/payments - Creates a new payment intent. Requires amount, currency, and payment method. Returns a payment object with status pending.', orderIndex: 2 },
    { sectionRef: '3.2', heading: 'Capture Payment', content: 'POST /v1/payments/{id}/capture - Captures an authorized payment. Can capture full or partial amount. Idempotent with idempotency key.', orderIndex: 3 },
    { sectionRef: '3.3', heading: 'Refund Payment', content: 'POST /v1/refunds - Creates a refund for a completed payment. Supports full and partial refunds. Refund amount cannot exceed original payment.', orderIndex: 4 },
    { sectionRef: '3.4', heading: 'List Transactions', content: 'GET /v1/transactions - Lists all transactions for the authenticated merchant. Supports pagination, filtering by date range, status, and amount.', orderIndex: 5 },
    { sectionRef: '4', heading: 'Webhooks', content: 'Configure webhook endpoints to receive real-time notifications for events like payment.completed, payment.failed, refund.created.', orderIndex: 6 },
    { sectionRef: '5', heading: 'Error Handling', content: 'All errors return JSON with error code, message, and details. HTTP status codes: 400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Rate Limited, 500 Server Error.', orderIndex: 7 },
  ];

  // Delete existing sections for this spec
  await prisma.specSection.deleteMany({ where: { specId: spec.id } });

  for (const section of sections) {
    await prisma.specSection.create({
      data: {
        specId: spec.id,
        ...section,
      },
    });
  }

  // 7. Create work items (Epic -> Features -> Stories)
  console.log('7. Creating work items...');

  // Delete existing work items for this spec
  await prisma.workItem.deleteMany({ where: { specId: spec.id } });

  // Epic 1: Payment Processing
  const epic1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      type: 'epic',
      title: 'Payment Processing Core',
      description: 'Implement the core payment processing functionality including payment creation, authorization, and capture flows.',
      status: 'approved',
      orderIndex: 0,
    },
  });

  // Feature 1.1: Create Payment
  const feature1_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: epic1.id,
      type: 'feature',
      title: 'Create Payment Endpoint',
      description: 'Implement POST /v1/payments endpoint to create new payment intents with support for multiple payment methods.',
      status: 'approved',
      orderIndex: 0,
    },
  });

  // Stories for Feature 1.1
  const story1_1_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature1_1.id,
      type: 'story',
      title: 'Create payment intent with card details',
      description: 'As a merchant, I want to create a payment intent with card details so that I can process a customer payment.',
      acceptanceCriteria: `Given a valid API key in the Authorization header
When I POST to /v1/payments with amount, currency, and card token
Then I receive a 201 response with payment object
And the payment status is "pending"
And a unique payment ID is generated

Given an invalid card token
When I POST to /v1/payments
Then I receive a 400 response with error code "invalid_card"

Given a missing required field (amount or currency)
When I POST to /v1/payments
Then I receive a 400 response with validation errors`,
      technicalNotes: `- Validate card token format before processing
- Generate UUID v4 for payment ID
- Store payment in pending state
- Emit payment.created event to message queue
- Rate limit: 100 requests/minute per merchant
- Idempotency: Use idempotency_key header to prevent duplicates`,
      sizeEstimate: 'M',
      status: 'approved',
      orderIndex: 0,
    },
  });

  const story1_1_2 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature1_1.id,
      type: 'story',
      title: 'Support idempotency keys for payment creation',
      description: 'As a merchant, I want to include an idempotency key when creating payments so that I can safely retry failed requests without creating duplicate payments.',
      acceptanceCriteria: `Given a valid idempotency key in the Idempotency-Key header
When I POST the same payment request twice with the same key
Then I receive the same payment object both times
And only one payment is created

Given an idempotency key that was used with different parameters
When I POST a new payment request
Then I receive a 409 Conflict error

Given no idempotency key
When I POST a payment request
Then the request is processed normally without idempotency protection`,
      technicalNotes: `- Store idempotency keys in Redis with 24-hour TTL
- Key format: merchant_id:idempotency_key
- Compare request hash to detect parameter changes
- Return cached response for duplicate requests`,
      sizeEstimate: 'S',
      status: 'ready_for_review',
      orderIndex: 1,
    },
  });

  const story1_1_3 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature1_1.id,
      type: 'story',
      title: 'Validate payment amounts and currencies',
      description: 'As the system, I need to validate payment amounts and currencies to ensure all payments meet business rules and prevent errors.',
      acceptanceCriteria: `Given an amount less than the minimum (50 cents)
When I create a payment
Then I receive a 400 error with code "amount_too_small"

Given an amount greater than the maximum ($999,999.99)
When I create a payment
Then I receive a 400 error with code "amount_too_large"

Given an unsupported currency code
When I create a payment
Then I receive a 400 error with code "invalid_currency"

Given a valid amount with more than 2 decimal places
When I create a payment
Then the amount is rounded to 2 decimal places`,
      technicalNotes: `- Supported currencies: USD, EUR, GBP, CAD, AUD
- Store amounts as integers (cents) internally
- Minimum amount: 50 (cents)
- Maximum amount: 99999999 (cents)
- Use BigDecimal for calculations to avoid floating point errors`,
      sizeEstimate: 'S',
      status: 'draft',
      orderIndex: 2,
    },
  });

  // Feature 1.2: Capture Payment
  const feature1_2 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: epic1.id,
      type: 'feature',
      title: 'Capture Payment Endpoint',
      description: 'Implement POST /v1/payments/{id}/capture endpoint to capture authorized payments with support for full and partial capture.',
      status: 'approved',
      orderIndex: 1,
    },
  });

  const story1_2_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature1_2.id,
      type: 'story',
      title: 'Capture full authorized payment amount',
      description: 'As a merchant, I want to capture the full authorized amount of a payment so that I can complete the transaction and receive funds.',
      acceptanceCriteria: `Given a payment in "authorized" status
When I POST to /v1/payments/{id}/capture without an amount
Then the full authorized amount is captured
And the payment status changes to "captured"
And a payment.captured event is emitted

Given a payment in "captured" status
When I try to capture it again
Then I receive a 400 error with code "already_captured"

Given a payment that has expired
When I try to capture it
Then I receive a 400 error with code "authorization_expired"`,
      technicalNotes: `- Authorization expires after 7 days by default
- Update payment status atomically
- Record capture timestamp
- Trigger settlement process asynchronously`,
      sizeEstimate: 'M',
      status: 'approved',
      orderIndex: 0,
    },
  });

  const story1_2_2 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature1_2.id,
      type: 'story',
      title: 'Support partial payment capture',
      description: 'As a merchant, I want to capture less than the authorized amount so that I can handle order modifications and split shipments.',
      acceptanceCriteria: `Given a payment authorized for $100
When I capture with amount $60
Then $60 is captured successfully
And $40 remains available for additional capture

Given a capture amount greater than remaining authorization
When I try to capture
Then I receive a 400 error with code "capture_amount_exceeds_authorization"

Given multiple partial captures
When the total captured equals the authorized amount
Then no further captures are allowed`,
      technicalNotes: `- Track captured_amount and remaining_amount
- Allow up to 10 partial captures per payment
- Each capture creates a separate capture record
- Final capture releases any remaining authorization`,
      sizeEstimate: 'M',
      status: 'ready_for_review',
      orderIndex: 1,
    },
  });

  // Epic 2: Refunds
  const epic2 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      type: 'epic',
      title: 'Refund Management',
      description: 'Implement refund functionality including full and partial refunds with proper validation and webhook notifications.',
      status: 'approved',
      orderIndex: 1,
    },
  });

  // Feature 2.1: Create Refund
  const feature2_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: epic2.id,
      type: 'feature',
      title: 'Create Refund Endpoint',
      description: 'Implement POST /v1/refunds endpoint to create refunds for captured payments.',
      status: 'ready_for_review',
      orderIndex: 0,
    },
  });

  const story2_1_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature2_1.id,
      type: 'story',
      title: 'Create full refund for captured payment',
      description: 'As a merchant, I want to refund the full captured amount to a customer when they return an order or cancel a service.',
      acceptanceCriteria: `Given a payment in "captured" status
When I POST to /v1/refunds with the payment_id and no amount
Then a full refund is created
And the payment status changes to "refunded"
And a refund.created event is emitted

Given a payment that has already been fully refunded
When I try to refund it again
Then I receive a 400 error with code "payment_already_refunded"

Given a payment in "pending" status
When I try to refund it
Then I receive a 400 error with code "payment_not_captured"`,
      technicalNotes: `- Refunds typically take 5-10 business days to appear
- Store refund reason for reporting
- Refunds may fail if original payment method is no longer valid
- Handle async refund processing with status updates`,
      sizeEstimate: 'M',
      status: 'draft',
      orderIndex: 0,
    },
  });

  const story2_1_2 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature2_1.id,
      type: 'story',
      title: 'Create partial refund',
      description: 'As a merchant, I want to refund a portion of a payment when a customer returns part of an order.',
      acceptanceCriteria: `Given a captured payment of $100
When I create a refund for $30
Then a partial refund of $30 is created
And the payment status changes to "partially_refunded"
And $70 remains available for additional refunds

Given refund amount greater than remaining refundable amount
When I try to create the refund
Then I receive a 400 error with code "refund_amount_exceeds_payment"`,
      technicalNotes: `- Track total_refunded and refundable_amount
- Allow multiple partial refunds
- Sum of refunds cannot exceed original captured amount
- Each refund gets a unique refund ID`,
      sizeEstimate: 'S',
      status: 'draft',
      orderIndex: 1,
    },
  });

  // Epic 3: Transaction History
  const epic3 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      type: 'epic',
      title: 'Transaction Reporting',
      description: 'Implement transaction listing and reporting capabilities for merchant dashboards and reconciliation.',
      status: 'draft',
      orderIndex: 2,
    },
  });

  const feature3_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: epic3.id,
      type: 'feature',
      title: 'List Transactions Endpoint',
      description: 'Implement GET /v1/transactions endpoint with filtering, sorting, and pagination.',
      status: 'draft',
      orderIndex: 0,
    },
  });

  const story3_1_1 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature3_1.id,
      type: 'story',
      title: 'List transactions with pagination',
      description: 'As a merchant, I want to retrieve a paginated list of my transactions so that I can view transaction history efficiently.',
      acceptanceCriteria: `Given transactions exist for a merchant
When I GET /v1/transactions
Then I receive the first page of transactions (default 20)
And response includes pagination metadata (total, page, has_more)

Given a page parameter
When I GET /v1/transactions?page=2
Then I receive the second page of results

Given a limit parameter
When I GET /v1/transactions?limit=50
Then I receive up to 50 transactions
And maximum limit is 100`,
      technicalNotes: `- Use cursor-based pagination for performance
- Default page size: 20, max: 100
- Sort by created_at desc by default
- Include total count in response metadata`,
      sizeEstimate: 'M',
      status: 'draft',
      orderIndex: 0,
    },
  });

  const story3_1_2 = await prisma.workItem.create({
    data: {
      specId: spec.id,
      parentId: feature3_1.id,
      type: 'story',
      title: 'Filter transactions by date range and status',
      description: 'As a merchant, I want to filter transactions by date range and status so that I can find specific transactions for reconciliation.',
      acceptanceCriteria: `Given filter parameters
When I GET /v1/transactions?created_after=2025-01-01&created_before=2025-01-31
Then I only receive transactions within that date range

Given a status filter
When I GET /v1/transactions?status=captured
Then I only receive captured transactions

Given multiple status filters
When I GET /v1/transactions?status=captured,refunded
Then I receive transactions matching either status`,
      technicalNotes: `- Date format: ISO 8601 (YYYY-MM-DD or full timestamp)
- Status values: pending, authorized, captured, refunded, failed
- Combine filters with AND logic
- Index database columns for filter performance`,
      sizeEstimate: 'S',
      status: 'draft',
      orderIndex: 1,
    },
  });

  // 8. Add dependencies
  console.log('8. Creating dependencies...');

  // story1_1_2 depends on story1_1_1
  await prisma.workItem.update({
    where: { id: story1_1_2.id },
    data: { dependsOnIds: [story1_1_1.id] },
  });

  // story1_2_1 depends on story1_1_1
  await prisma.workItem.update({
    where: { id: story1_2_1.id },
    data: { dependsOnIds: [story1_1_1.id] },
  });

  // story2_1_1 depends on story1_2_1
  await prisma.workItem.update({
    where: { id: story2_1_1.id },
    data: { dependsOnIds: [story1_2_1.id] },
  });

  // 9. Create some story edits (for learning loop)
  console.log('9. Creating story edits...');
  await prisma.storyEdit.createMany({
    data: [
      {
        projectId: PROJECT_ID,
        workItemId: story1_1_1.id,
        field: 'acceptanceCriteria',
        beforeValue: 'When I POST to /v1/payments\nThen I receive a 200 response',
        afterValue: 'When I POST to /v1/payments with amount, currency, and card token\nThen I receive a 201 response with payment object',
        editType: 'modification',
        specId: spec.id,
        userId: 'user-001',
      },
      {
        projectId: PROJECT_ID,
        workItemId: story1_1_1.id,
        field: 'technicalNotes',
        beforeValue: '',
        afterValue: 'Rate limit: 100 requests/minute per merchant',
        editType: 'addition',
        specId: spec.id,
        userId: 'user-001',
      },
    ],
  });

  // 10. Create learned patterns
  console.log('10. Creating learned patterns...');
  await prisma.learnedPattern.createMany({
    data: [
      {
        projectId: PROJECT_ID,
        pattern: 'Users consistently add rate limiting info to technical notes',
        description: 'In 3 out of 4 API endpoint stories, rate limiting details were added to technical notes.',
        confidence: 0.75,
        occurrences: 3,
        field: 'technicalNotes',
        context: 'API endpoints',
        suggestion: 'Always include rate limiting requirements in technical notes for API endpoint stories',
        suggestionType: 'addToPreferences',
        status: 'pending',
      },
      {
        projectId: PROJECT_ID,
        pattern: 'HTTP 201 for resource creation endpoints',
        description: 'Changed 200 to 201 for POST endpoints that create resources.',
        confidence: 0.85,
        occurrences: 4,
        field: 'acceptanceCriteria',
        context: 'REST API conventions',
        suggestion: 'Use HTTP 201 Created status code for successful POST requests that create new resources',
        suggestionType: 'addToPreferences',
        status: 'suggested',
      },
    ],
  });

  // 11. Create health score
  console.log('11. Creating health score...');
  await prisma.projectHealth.upsert({
    where: { projectId: PROJECT_ID },
    update: {
      score: 78,
      level: 'good',
      briefScore: 90,
      glossaryScore: 85,
      prefsScore: 80,
      specsScore: 75,
      sourcesScore: 50,
      learningScore: 60,
      recommendations: [
        'Add more context sources (e.g., link to existing API documentation)',
        'Review and accept pending learned patterns',
        'Add more glossary terms for security concepts',
      ],
      calculatedAt: new Date(),
    },
    create: {
      projectId: PROJECT_ID,
      score: 78,
      level: 'good',
      briefScore: 90,
      glossaryScore: 85,
      prefsScore: 80,
      specsScore: 75,
      sourcesScore: 50,
      learningScore: 60,
      recommendations: [
        'Add more context sources',
        'Review pending learned patterns',
      ],
      calculatedAt: new Date(),
    },
  });

  // 12. Create context source
  console.log('12. Creating context source...');
  await prisma.contextSource.upsert({
    where: { id: 'ctx-src-stripe-docs' },
    update: {},
    create: {
      id: 'ctx-src-stripe-docs',
      projectId: PROJECT_ID,
      sourceType: 'document',
      name: 'Stripe API Reference',
      isEnabled: true,
      config: {
        url: 'https://stripe.com/docs/api',
        description: 'Reference for API design patterns',
      },
      itemCount: 15,
      lastSyncAt: new Date(),
    },
  });

  console.log('\n✅ Demo data seeded successfully!');
  console.log(`
Summary:
- Project: PaymentGateway API
- Brief: Comprehensive project overview
- Glossary: 10 terms
- Preferences: Configured with custom rules
- Spec: Payment API v1.0 with 8 sections
- Work Items: 3 Epics, 5 Features, 8 Stories
- Dependencies: 4 story dependencies
- Story Edits: 2 edit records
- Learned Patterns: 2 patterns
- Health Score: 78% (Good)
- Context Source: 1 external reference
`);
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
