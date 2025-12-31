# F23: Seed Data (Moorfields Test Project)

> **Priority:** CRITICAL | **Effort:** 2 hours | **Phase:** 1

---

## Overview

**What:** Create a realistic seed data script that populates a complete Moorfields Eye Hospital test project with specs, stories, glossary, and all supporting data.

**Why:** User feedback: "Can't properly test features without data." Testing new features requires realistic data. Manual setup is tedious and inconsistent. Seed data enables:
- Quick environment setup for developers
- Consistent demo data for stakeholders
- Automated testing with known data state

**Success Criteria:**
- Run one command to create complete test project
- Project includes all Wave 3 features (knowledge base, glossary, preferences, etc.)
- Data is realistic (Moorfields healthcare domain)
- Can reset and re-seed at any time

---

## User Stories

### Must Have

**US-23.1:** As a developer, I want to run a seed command so that I have test data to work with.
- **AC:** Run `npm run seed` → Creates Moorfields project
- **AC:** Project appears in project list
- **AC:** All features populated with data

**US-23.2:** As a developer, I want the seed data to cover all features so that I can test any part of the app.
- **AC:** Project brief is populated
- **AC:** Glossary has 10+ terms
- **AC:** Preferences are configured
- **AC:** At least 2 translated specs with work items
- **AC:** Reference documents uploaded
- **AC:** Context sources configured

**US-23.3:** As a developer, I want to reset seed data so that I can start fresh.
- **AC:** Run `npm run seed:reset` → Deletes and recreates
- **AC:** No orphaned data left behind

---

## Seed Data Content

### Project: Moorfields Eye Hospital Integration

```typescript
const PROJECT = {
  name: 'Moorfields Eye Hospital - OpenEyes Integration',
  description: 'Integration between OpenEyes electronic medical records and Meditech hospital information system for patient data synchronization.',
  jiraProjectKey: 'MOE',
};
```

### Project Brief

```markdown
# Moorfields Eye Hospital - OpenEyes Integration

## Overview
This project delivers bidirectional data synchronization between OpenEyes (ophthalmic EMR) and Meditech (hospital information system) at Moorfields Eye Hospital NHS Foundation Trust.

## Key Objectives
1. Real-time patient demographic sync from Meditech to OpenEyes
2. Allergy and medication data exchange
3. Appointment scheduling integration
4. Clinical letter generation and distribution

## Technical Context
- OpenEyes: PHP-based, REST API, MySQL database
- Meditech: HL7 v2.x messaging, proprietary database
- Integration: Mirth Connect integration engine

## Stakeholders
- Clinical: Ophthalmologists, nurses, optometrists
- IT: OpenEyes team, Meditech team, Integration team
- Management: CIO, CCIO, Project sponsors

## Timeline
- Phase 1: Patient demographics (Q1)
- Phase 2: Allergies & medications (Q2)  
- Phase 3: Appointments (Q3)
- Phase 4: Clinical letters (Q4)
```

### Glossary Terms

```typescript
const GLOSSARY_TERMS = [
  {
    term: 'OpenEyes',
    definition: 'Open-source electronic medical record system specifically designed for ophthalmology. Used as the primary clinical system at Moorfields.',
    aliases: ['OE'],
    category: 'Systems',
  },
  {
    term: 'Meditech',
    definition: 'Hospital information system (HIS) managing patient administration, billing, and core hospital functions.',
    aliases: ['MT', 'Meditech Expanse'],
    category: 'Systems',
  },
  {
    term: 'HL7',
    definition: 'Health Level Seven - international standards for electronic health information exchange. Moorfields uses HL7 v2.x for messaging.',
    aliases: ['HL7 v2', 'HL7v2.x'],
    category: 'Standards',
  },
  {
    term: 'MRN',
    definition: 'Medical Record Number - unique patient identifier assigned by Meditech. Format: 8 digits, e.g., 12345678.',
    aliases: ['Medical Record Number', 'Hospital Number'],
    category: 'Identifiers',
  },
  {
    term: 'NHS Number',
    definition: '10-digit unique identifier for patients in the NHS. Primary identifier for cross-system matching.',
    aliases: ['NHS No'],
    category: 'Identifiers',
  },
  {
    term: 'PAS',
    definition: 'Patient Administration System - the Meditech module handling patient registration, appointments, and admissions.',
    aliases: ['Patient Admin'],
    category: 'Systems',
  },
  {
    term: 'ADT',
    definition: 'Admit-Discharge-Transfer - HL7 message type for patient movement events. Triggers demographic updates in OpenEyes.',
    aliases: ['ADT message', 'A01', 'A08'],
    category: 'Standards',
  },
  {
    term: 'Mirth Connect',
    definition: 'Open-source integration engine used to route and transform messages between Meditech and OpenEyes.',
    aliases: ['Mirth', 'NextGen Connect'],
    category: 'Systems',
  },
  {
    term: 'SNOMED CT',
    definition: 'Systematized Nomenclature of Medicine Clinical Terms - standardized clinical terminology used for allergies and diagnoses.',
    aliases: ['SNOMED'],
    category: 'Standards',
  },
  {
    term: 'dm+d',
    definition: 'Dictionary of medicines and devices - NHS standard for medication identification used in prescription data.',
    aliases: ['DMD'],
    category: 'Standards',
  },
  {
    term: 'Clinical Letter',
    definition: 'Post-consultation correspondence sent to GPs and referrers. Generated in OpenEyes, distributed via NHS Mail.',
    aliases: ['Clinic letter', 'Outcome letter'],
    category: 'Documents',
  },
  {
    term: 'Worklist',
    definition: 'Filtered list of patients for a specific clinic session. Populated from Meditech appointments.',
    aliases: ['Clinic worklist'],
    category: 'Features',
  },
];
```

### Team Preferences

```typescript
const PREFERENCES = {
  acFormat: 'gherkin',
  requiredSections: ['description', 'acceptanceCriteria', 'technicalNotes'],
  maxAcCount: 6,
  verbosity: 'balanced',
  technicalDepth: 'moderate',
  customPrefs: {
    includeHL7Examples: true,
    requireErrorHandling: true,
    mandatoryFields: ['priority', 'component'],
  },
};
```

### Spec 1: Patient Demographics Sync

```markdown
# Patient Demographics Synchronization

## 1. Overview

This specification defines the requirements for real-time synchronization of patient demographic data from Meditech PAS to OpenEyes.

## 2. Scope

### 2.1 In Scope
- ADT message processing (A01, A04, A08, A31)
- Patient create, update, merge operations
- Demographic fields: name, DOB, address, contact, GP
- NHS Number and MRN matching

### 2.2 Out of Scope
- Historical data migration
- Photo ID synchronization
- Next of kin complex relationships

## 3. Functional Requirements

### 3.1 Message Reception
The integration engine shall receive HL7 ADT messages from Meditech via TCP/IP on port 5000. Messages shall be acknowledged with AA (accept) or AE (error) response.

### 3.2 Patient Matching
When an ADT message is received, the system shall:
1. Extract NHS Number from PID-3
2. Search OpenEyes for existing patient
3. If found, update demographics
4. If not found, create new patient record

### 3.3 Field Mapping
| Meditech Field | HL7 Segment | OpenEyes Field |
|----------------|-------------|----------------|
| MRN | PID-3 (MR) | hos_num |
| NHS Number | PID-3 (NHS) | nhs_num |
| Surname | PID-5.1 | last_name |
| Forename | PID-5.2 | first_name |
| DOB | PID-7 | dob |
| Gender | PID-8 | gender |
| Address | PID-11 | address |
| Phone | PID-13 | primary_phone |
| GP Code | PD1-4 | gp_id |

### 3.4 Error Handling
- Invalid NHS Number format: Log error, send alert, reject message
- Patient not found for update: Create new patient
- Duplicate detection: Flag for manual review
- Connection failure: Queue messages, retry with backoff

## 4. Non-Functional Requirements

### 4.1 Performance
- Message processing time: < 2 seconds
- Throughput: 100 messages per minute minimum

### 4.2 Reliability
- Message delivery guarantee: At least once
- No data loss during system restart

### 4.3 Audit
- All operations logged with timestamp, user, before/after values
- Retain logs for 7 years per NHS requirements
```

### Spec 2: Allergy Data Exchange

```markdown
# Allergy Information Exchange

## 1. Overview

This specification defines bidirectional allergy data exchange between OpenEyes and Meditech to ensure consistent allergy information across clinical systems.

## 2. Clinical Safety

**CRITICAL**: Allergy data is patient safety critical. All implementations must be reviewed by Clinical Safety Officer before go-live.

## 3. Functional Requirements

### 3.1 Allergy Sync from Meditech
When a patient's allergies are updated in Meditech:
1. HL7 ADT^A60 message sent to integration engine
2. Allergies extracted from AL1 segments
3. SNOMED CT code mapping applied
4. OpenEyes patient record updated

### 3.2 Allergy Recording in OpenEyes
When clinician records allergy in OpenEyes:
1. Allergy saved locally with SNOMED CT code
2. HL7 ADT^A60 message generated
3. Message sent to Meditech
4. Confirmation received and logged

### 3.3 Allergy Data Model
```json
{
  "allergen": "Penicillin",
  "allergenCode": "373270004",
  "allergenCodeSystem": "SNOMED CT",
  "reactionType": "allergy",
  "severity": "severe",
  "reaction": "Anaphylaxis",
  "reactionCode": "39579001",
  "recordedDate": "2024-01-15",
  "recordedBy": "Dr Smith",
  "source": "Meditech"
}
```

### 3.4 Conflict Resolution
If allergy data conflicts between systems:
1. Most recent update wins
2. Conflict flagged for clinical review
3. Both versions retained in audit log

### 3.5 No Known Allergies
- Explicit "No Known Allergies" status must sync
- Empty allergy list ≠ No Known Allergies
- Clinical confirmation required

## 4. Error Handling

### 4.1 Invalid SNOMED Code
- Log warning
- Store original text
- Flag for terminology mapping

### 4.2 Unknown Allergen
- Create as free-text allergy
- Flag for clinical coding
```

### Work Items (Pre-generated)

The seed script will create work items as if translation has occurred:

**Epic 1: Patient Demographics Integration**
- Feature 1.1: ADT Message Processing
  - Story: Implement HL7 message listener
  - Story: Parse ADT message types
  - Story: Acknowledge valid messages
  - Story: Reject malformed messages
- Feature 1.2: Patient Matching
  - Story: NHS Number lookup
  - Story: MRN fallback matching
  - Story: Create new patient flow
  - Story: Update existing patient

**Epic 2: Allergy Data Exchange**
- Feature 2.1: Inbound Allergy Sync
  - Story: Process ADT^A60 messages
  - Story: Map SNOMED CT codes
  - Story: Update OpenEyes allergies
- Feature 2.2: Outbound Allergy Sync
  - Story: Generate HL7 on allergy save
  - Story: Send to Meditech
  - Story: Handle acknowledgment

---

## Technical Implementation

### Seed Script

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Clean existing seed data (idempotent)
  await cleanSeedData();
  
  // Create project
  const project = await createProject();
  console.log(`✅ Created project: ${project.name}`);
  
  // Create knowledge base
  await createKnowledgeBase(project.id);
  console.log('✅ Created knowledge base');
  
  // Create glossary
  await createGlossary(project.id);
  console.log('✅ Created glossary (12 terms)');
  
  // Create preferences
  await createPreferences(project.id);
  console.log('✅ Created team preferences');
  
  // Create specs with work items
  await createSpecs(project.id);
  console.log('✅ Created specs with work items');
  
  // Create reference documents
  await createReferenceDocuments(project.id);
  console.log('✅ Created reference documents');
  
  // Create context sources
  await createContextSources(project.id);
  console.log('✅ Created context sources');
  
  // Calculate health score
  await calculateHealthScore(project.id);
  console.log('✅ Calculated project health');
  
  console.log('\n🎉 Seed complete!');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   Project: ${project.name}`);
}

async function cleanSeedData() {
  // Delete project with name starting with 'Moorfields' (cascade deletes related data)
  await prisma.project.deleteMany({
    where: { name: { startsWith: 'Moorfields' } }
  });
}

async function createProject() {
  return prisma.project.create({
    data: {
      id: uuid(),
      name: 'Moorfields Eye Hospital - OpenEyes Integration',
      description: 'Integration between OpenEyes EMR and Meditech HIS for patient data synchronization.',
      jiraProjectKey: 'MOE',
      settings: {
        defaultTemplate: 'story',
        autoTranslate: false,
      },
    },
  });
}

async function createKnowledgeBase(projectId: string) {
  await prisma.projectKnowledge.create({
    data: {
      id: uuid(),
      projectId,
      brief: BRIEF_CONTENT, // Full markdown from above
      briefUpdatedAt: new Date(),
    },
  });
}

async function createGlossary(projectId: string) {
  for (const term of GLOSSARY_TERMS) {
    await prisma.glossaryTerm.create({
      data: {
        id: uuid(),
        projectId,
        term: term.term,
        definition: term.definition,
        aliases: term.aliases,
        category: term.category,
        isManual: true,
        confidence: 1.0,
      },
    });
  }
}

async function createPreferences(projectId: string) {
  await prisma.teamPreferencesConfig.create({
    data: {
      id: uuid(),
      projectId,
      acFormat: 'gherkin',
      requiredSections: ['description', 'acceptanceCriteria', 'technicalNotes'],
      maxAcCount: 6,
      verbosity: 'balanced',
      technicalDepth: 'moderate',
      customPrefs: {
        includeHL7Examples: true,
        requireErrorHandling: true,
      },
    },
  });
}

async function createSpecs(projectId: string) {
  // Spec 1: Patient Demographics
  const spec1 = await prisma.spec.create({
    data: {
      id: uuid(),
      projectId,
      name: 'Patient Demographics Sync',
      filePath: '/seed/patient-demographics.md',
      fileType: 'md',
      fileSize: 4500,
      extractedText: DEMOGRAPHICS_SPEC_CONTENT,
      status: 'translated',
      specType: 'requirements',
      uploadedBy: 'seed',
      uploadedAt: new Date(),
    },
  });
  
  // Create sections for spec 1
  await createSections(spec1.id, DEMOGRAPHICS_SECTIONS);
  
  // Create work items for spec 1
  await createWorkItems(spec1.id, DEMOGRAPHICS_WORK_ITEMS);
  
  // Spec 2: Allergy Exchange
  const spec2 = await prisma.spec.create({
    data: {
      id: uuid(),
      projectId,
      name: 'Allergy Data Exchange',
      filePath: '/seed/allergy-exchange.md',
      fileType: 'md',
      fileSize: 3200,
      extractedText: ALLERGY_SPEC_CONTENT,
      status: 'translated',
      specType: 'requirements',
      uploadedBy: 'seed',
      uploadedAt: new Date(),
    },
  });
  
  await createSections(spec2.id, ALLERGY_SECTIONS);
  await createWorkItems(spec2.id, ALLERGY_WORK_ITEMS);
}

async function createWorkItems(specId: string, items: WorkItemInput[]) {
  for (const item of items) {
    const workItem = await prisma.workItem.create({
      data: {
        id: uuid(),
        specId,
        parentId: item.parentId,
        type: item.type,
        title: item.title,
        description: item.description,
        acceptanceCriteria: item.acceptanceCriteria,
        technicalNotes: item.technicalNotes,
        sizeEstimate: item.size,
        status: item.status || 'draft',
        orderIndex: item.orderIndex,
      },
    });
    
    // If this item has children, recursively create them
    if (item.children) {
      for (const child of item.children) {
        child.parentId = workItem.id;
      }
      await createWorkItems(specId, item.children);
    }
  }
}

async function createReferenceDocuments(projectId: string) {
  await prisma.referenceDocument.create({
    data: {
      id: uuid(),
      projectId,
      name: 'HL7 v2.x Implementation Guide',
      fileName: 'hl7-v2-guide.pdf',
      filePath: '/seed/hl7-guide.pdf',
      fileType: 'pdf',
      fileSize: 125000,
      extractedText: 'HL7 Version 2.x Implementation Guide for Healthcare Integration...',
      summary: 'Reference guide for HL7 v2.x message structure and segments used in Meditech integration.',
      docType: 'technical',
      isActive: true,
      uploadedBy: 'seed',
    },
  });
  
  await prisma.referenceDocument.create({
    data: {
      id: uuid(),
      projectId,
      name: 'OpenEyes API Documentation',
      fileName: 'openeyes-api.pdf',
      filePath: '/seed/openeyes-api.pdf',
      fileType: 'pdf',
      fileSize: 89000,
      extractedText: 'OpenEyes REST API Documentation v3.0...',
      summary: 'API reference for OpenEyes EMR system including patient and allergy endpoints.',
      docType: 'technical',
      isActive: true,
      uploadedBy: 'seed',
    },
  });
}

async function createContextSources(projectId: string) {
  await prisma.contextSource.create({
    data: {
      id: uuid(),
      projectId,
      sourceType: 'jira',
      name: 'MOE Jira Project',
      isEnabled: true,
      config: {
        projectKey: 'MOE',
        includeSubtasks: true,
      },
      itemCount: 45,
      lastSyncAt: new Date(),
    },
  });
  
  await prisma.contextSource.create({
    data: {
      id: uuid(),
      projectId,
      sourceType: 'confluence',
      name: 'OpenEyes Confluence Space',
      isEnabled: false,
      config: {
        spaceKey: 'OE',
      },
      itemCount: 0,
    },
  });
}

async function calculateHealthScore(projectId: string) {
  // Calculate scores based on seeded data
  await prisma.projectHealth.create({
    data: {
      id: uuid(),
      projectId,
      score: 82,
      level: 'good',
      briefScore: 95,
      glossaryScore: 90,
      prefsScore: 85,
      specsScore: 75,
      sourcesScore: 60,
      learningScore: 70,
      recommendations: [
        { area: 'sources', message: 'Enable Confluence integration for better context' },
        { area: 'learning', message: 'Review and accept pending pattern suggestions' },
      ],
    },
  });
}

// Run seed
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Package.json Scripts

```json
{
  "scripts": {
    "seed": "npx prisma db seed",
    "seed:reset": "npx prisma migrate reset && npx prisma db seed"
  }
}
```

### Prisma Config

```json
// In prisma/package.json or schema.prisma
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

---

## Testing Checklist

### Seed Script Tests

- [ ] `npm run seed` completes without errors
- [ ] Project appears in database
- [ ] All 12 glossary terms created
- [ ] Both specs created with correct status
- [ ] Work items have correct parent relationships
- [ ] Reference documents exist
- [ ] Project health score calculated

### Idempotency Tests

- [ ] Running seed twice doesn't duplicate data
- [ ] `seed:reset` cleans and recreates correctly

### Integration Tests

- [ ] Seeded project appears in UI
- [ ] Can navigate to knowledge base
- [ ] Glossary terms display correctly
- [ ] Specs show as translated
- [ ] Work items render in tree view

---

## Rollback Plan

If seed causes issues:
1. `npx prisma migrate reset` to wipe database
2. Remove seed script from prisma config
3. Manually create test data as needed

---

*F23 Specification v1.0*
