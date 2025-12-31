import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new project for Moorfields
const MOORFIELDS_PROJECT_ID = 'e712d4a2-89c1-4b5f-9a3d-2e8f6c1b0d9e';

async function main() {
  console.log('Seeding Moorfields Patient Portal demo data...\n');

  // 1. Create the project
  console.log('1. Creating Moorfields project...');
  await prisma.project.upsert({
    where: { id: MOORFIELDS_PROJECT_ID },
    update: {
      name: 'Moorfields Patient Portal',
      description: 'Digital patient portal for Moorfields Eye Hospital enabling patients to manage appointments, view test results, access medical records, and communicate with care teams.',
      jiraProjectKey: 'MFPP',
      settings: {
        defaultAcFormat: 'gherkin',
        defaultSize: 'M',
        autoApproveMinor: false,
        clinicalReview: true,
      },
    },
    create: {
      id: MOORFIELDS_PROJECT_ID,
      name: 'Moorfields Patient Portal',
      description: 'Digital patient portal for Moorfields Eye Hospital enabling patients to manage appointments, view test results, access medical records, and communicate with care teams.',
      jiraProjectKey: 'MFPP',
      settings: {
        defaultAcFormat: 'gherkin',
        defaultSize: 'M',
        autoApproveMinor: false,
        clinicalReview: true,
      },
    },
  });

  // 2. Create project knowledge (brief)
  console.log('2. Creating project brief...');
  await prisma.projectKnowledge.upsert({
    where: { projectId: MOORFIELDS_PROJECT_ID },
    update: {
      brief: `# Moorfields Patient Portal

## Overview
The Moorfields Patient Portal is a digital health platform that empowers patients to take an active role in their eye care journey. It provides secure access to medical records, appointment management, test results, and direct communication with clinical teams.

## Goals
- Enable patients to self-manage appointments (book, reschedule, cancel)
- Provide secure access to clinical letters and test results
- Support accessible design for patients with visual impairments
- Integrate with existing hospital PAS (Patient Administration System)
- Meet NHS Digital Service Standards and WCAG 2.1 AAA accessibility
- Ensure GDPR and NHS data security compliance

## Clinical Context
Moorfields Eye Hospital is a world-leading centre for eye care, treating over 700,000 patients annually across 30+ sites. The portal must handle:
- Outpatient appointments across multiple specialties
- Complex diagnostic imaging (OCT, visual fields, fundus photography)
- Long-term condition monitoring (glaucoma, diabetic retinopathy, AMD)
- Surgical pre-assessment and post-op care

## Architecture
- React frontend with NHS Design System components
- Node.js backend with Fastify
- Integration layer for PAS (Cerner Millennium)
- FHIR R4 APIs for clinical data exchange
- Azure UK South hosting (NHS compliant)

## Key Stakeholders
- **Clinical Lead**: Mr. James Chen (Consultant Ophthalmologist)
- **Digital Lead**: Dr. Sarah Mitchell
- **Patient Representative**: Janet Williams
- **Tech Lead**: Alex Thompson

## Accessibility Requirements
- Screen reader compatible (JAWS, NVDA, VoiceOver)
- High contrast mode with customizable text size
- Keyboard navigation for all features
- Audio descriptions for visual content
- Simple language (reading age 9-11)`,
      briefUpdatedAt: new Date(),
    },
    create: {
      projectId: MOORFIELDS_PROJECT_ID,
      brief: `# Moorfields Patient Portal

## Overview
A digital health platform for Moorfields Eye Hospital patients to manage appointments, view results, and communicate with care teams.

## Goals
- Patient self-service for appointments
- Secure access to medical records
- NHS Digital Service Standards compliance
- WCAG 2.1 AAA accessibility`,
      briefUpdatedAt: new Date(),
    },
  });

  // 3. Create glossary terms
  console.log('3. Creating glossary terms...');
  const glossaryTerms = [
    { term: 'PAS', definition: 'Patient Administration System - The hospital\'s core system for managing patient demographics, appointments, and clinic lists. At Moorfields, this is Cerner Millennium.', category: 'Systems' },
    { term: 'OCT', definition: 'Optical Coherence Tomography - A non-invasive imaging test that uses light waves to take cross-section pictures of the retina. Critical for monitoring conditions like AMD and glaucoma.', category: 'Clinical' },
    { term: 'AMD', definition: 'Age-related Macular Degeneration - A progressive eye condition affecting the macula, causing central vision loss. Patients require regular monitoring and anti-VEGF injections.', category: 'Clinical' },
    { term: 'Visual Acuity', definition: 'A measure of the eye\'s ability to distinguish details and shapes. Usually measured using a Snellen chart (e.g., 6/6 is normal vision).', category: 'Clinical' },
    { term: 'FHIR', definition: 'Fast Healthcare Interoperability Resources - A standard for exchanging healthcare information electronically. Version R4 is used for the clinical data APIs.', category: 'Technical' },
    { term: 'NHS Login', definition: 'The NHS\'s single sign-on service that allows patients to access multiple NHS digital services with one set of login credentials.', category: 'Authentication' },
    { term: 'Clinic Letter', definition: 'A formal letter written after a clinical appointment summarizing the consultation, diagnosis, and treatment plan. Sent to patient and GP.', category: 'Clinical' },
    { term: 'IOP', definition: 'Intraocular Pressure - The fluid pressure inside the eye. Elevated IOP is a key risk factor for glaucoma. Normal range is 10-21 mmHg.', category: 'Clinical' },
    { term: 'Visual Field Test', definition: 'A diagnostic test that measures the entire area (field) of vision, including peripheral vision. Used to monitor glaucoma progression.', category: 'Clinical' },
    { term: 'Anti-VEGF', definition: 'A class of medications injected into the eye to treat wet AMD and diabetic retinopathy. Common drugs include Eylea, Lucentis, and Avastin.', category: 'Clinical' },
    { term: 'HES', definition: 'Hospital Eye Service - NHS outpatient eye clinics based in hospitals, as opposed to community optometry services.', category: 'NHS' },
    { term: 'Referral', definition: 'The process of sending a patient from one healthcare provider (e.g., optician) to another (e.g., hospital eye service) for further investigation or treatment.', category: 'Clinical' },
  ];

  for (const term of glossaryTerms) {
    await prisma.glossaryTerm.upsert({
      where: { projectId_term: { projectId: MOORFIELDS_PROJECT_ID, term: term.term } },
      update: { definition: term.definition, category: term.category },
      create: { projectId: MOORFIELDS_PROJECT_ID, ...term },
    });
  }

  // 4. Create preferences config
  console.log('4. Creating team preferences...');
  await prisma.teamPreferencesConfig.upsert({
    where: { projectId: MOORFIELDS_PROJECT_ID },
    update: {
      acFormat: 'gherkin',
      requiredSections: ['accessibility', 'clinical-validation', 'data-security', 'patient-safety'],
      maxAcCount: 10,
      verbosity: 'detailed',
      technicalDepth: 'detailed',
      customPrefs: {
        includeAccessibility: true,
        includePatientJourney: true,
        clinicalReviewRequired: true,
        dataClassification: 'NHS-Confidential',
      },
    },
    create: {
      projectId: MOORFIELDS_PROJECT_ID,
      acFormat: 'gherkin',
      requiredSections: ['accessibility', 'clinical-validation', 'data-security', 'patient-safety'],
      maxAcCount: 10,
      verbosity: 'detailed',
      technicalDepth: 'detailed',
      customPrefs: {
        includeAccessibility: true,
        includePatientJourney: true,
        clinicalReviewRequired: true,
        dataClassification: 'NHS-Confidential',
      },
    },
  });

  // 5. Create a spec
  console.log('5. Creating spec...');
  const specId = 'aab12c3d-4e5f-6789-abcd-ef0123456789';
  await prisma.spec.upsert({
    where: { id: specId },
    update: {
      name: 'Patient Appointment Management',
      status: 'translated',
      extractedText: 'Appointment management system specification for the Moorfields Patient Portal.',
    },
    create: {
      id: specId,
      projectId: MOORFIELDS_PROJECT_ID,
      name: 'Patient Appointment Management',
      filePath: '/uploads/moorfields/appointment-spec.md',
      fileType: 'md',
      fileSize: 45000,
      status: 'translated',
      specType: 'requirements-doc',
      uploadedBy: 'admin',
      extractedText: 'Appointment management system specification for the Moorfields Patient Portal.',
    },
  });

  // 6. Create sections
  console.log('6. Creating spec sections...');
  const sections = [
    { sectionRef: '1', heading: 'Overview', content: 'The appointment management module enables patients to view, book, reschedule, and cancel their eye care appointments across all Moorfields sites.', orderIndex: 0 },
    { sectionRef: '2', heading: 'Appointment Viewing', content: 'Patients can view all upcoming and past appointments with clinic details, preparation instructions, and location information including accessibility features.', orderIndex: 1 },
    { sectionRef: '3', heading: 'Appointment Booking', content: 'Patients can book follow-up appointments for approved appointment types. The system shows available slots based on clinical requirements and patient preferences.', orderIndex: 2 },
    { sectionRef: '4', heading: 'Rescheduling', content: 'Patients can reschedule appointments within clinical guidelines. Some appointments (e.g., injection clinics) may have restrictions on rebooking.', orderIndex: 3 },
    { sectionRef: '5', heading: 'Cancellation', content: 'Patients can cancel appointments with appropriate notice. The system captures cancellation reasons for clinical audit.', orderIndex: 4 },
    { sectionRef: '6', heading: 'Appointment Reminders', content: 'Automated SMS and email reminders are sent at configurable intervals (7 days, 2 days, 1 day before). Patients can set communication preferences.', orderIndex: 5 },
    { sectionRef: '7', heading: 'Accessibility', content: 'The booking interface must be fully accessible with screen reader support, high contrast mode, and large text options. Navigation must work with keyboard only.', orderIndex: 6 },
    { sectionRef: '8', heading: 'Integration', content: 'The module integrates with Cerner Millennium PAS for real-time appointment data synchronization. Changes made by patients are reflected in clinical systems within 5 minutes.', orderIndex: 7 },
  ];

  await prisma.specSection.deleteMany({ where: { specId } });
  for (const section of sections) {
    await prisma.specSection.create({
      data: { specId, ...section },
    });
  }

  // 7. Create work items (Epic -> Features -> Stories)
  console.log('7. Creating work items...');

  // Delete existing work items for this spec
  await prisma.workItem.deleteMany({ where: { specId } });

  // Epic
  const epic = await prisma.workItem.create({
    data: {
      specId,
      type: 'epic',
      title: 'Patient Appointment Self-Service',
      description: 'Enable Moorfields patients to independently manage their eye care appointments through a secure, accessible digital portal, reducing administrative burden and improving patient experience.',
      acceptanceCriteria: `**Epic Success Metrics:**
- 70% of eligible patients actively using self-service by 6 months post-launch
- DNA (Did Not Attend) rate reduced by 20%
- Patient satisfaction score of 4.5/5 or higher
- 100% WCAG 2.1 AAA compliance`,
      technicalNotes: `**Technical Scope:**
- PAS integration via Cerner HL7 FHIR R4 APIs
- NHS Login for authentication
- Real-time slot availability with 5-minute sync
- SMS gateway integration (Gov.UK Notify)
- Audit logging for all patient actions`,
      sizeEstimate: 'XL',
      status: 'ready_for_review',
      orderIndex: 0,
    },
  });

  // Feature 1: View Appointments
  const feature1 = await prisma.workItem.create({
    data: {
      specId,
      parentId: epic.id,
      type: 'feature',
      title: 'View Appointments Dashboard',
      description: 'A comprehensive dashboard showing all upcoming and historical appointments with filtering, search, and detailed appointment information.',
      acceptanceCriteria: `**Acceptance Criteria:**
- Display upcoming appointments in chronological order
- Show appointment type, date, time, clinic, and clinician
- Include past appointments with outcome summary
- Filter by date range, clinic, and appointment type
- Search by clinician name or reference number`,
      technicalNotes: `**Integration:** Cerner FHIR Appointment and Encounter resources
**Caching:** 5-minute TTL for appointment lists
**Pagination:** Maximum 50 appointments per page`,
      sizeEstimate: 'L',
      status: 'ready_for_review',
      orderIndex: 0,
    },
  });

  // Feature 2: Book Appointments
  const feature2 = await prisma.workItem.create({
    data: {
      specId,
      parentId: epic.id,
      type: 'feature',
      title: 'Appointment Booking',
      description: 'Allow patients to book follow-up appointments for approved clinic types, showing available slots based on clinical requirements.',
      acceptanceCriteria: `**Acceptance Criteria:**
- Show only bookable appointment types
- Display available slots for next 12 weeks
- Filter by preferred site, day of week, time of day
- Confirm booking with patient details review
- Send immediate confirmation via email/SMS`,
      technicalNotes: `**Clinical Rules Engine:** Appointment eligibility rules from PAS
**Slot Locking:** 10-minute lock during booking flow
**Conflict Detection:** Check for existing appointments on same day`,
      sizeEstimate: 'L',
      status: 'ready_for_review',
      orderIndex: 1,
    },
  });

  // Feature 3: Reschedule/Cancel
  const feature3 = await prisma.workItem.create({
    data: {
      specId,
      parentId: epic.id,
      type: 'feature',
      title: 'Reschedule and Cancel Appointments',
      description: 'Enable patients to reschedule or cancel appointments within clinical guidelines, capturing reasons and ensuring continuity of care.',
      acceptanceCriteria: `**Acceptance Criteria:**
- Reschedule with same available slot selection as booking
- Cancel with mandatory reason selection
- Prevent changes within 24 hours (except cancellation)
- Show impact warning for injection appointments
- Trigger care team notification for high-risk patients`,
      technicalNotes: `**Business Rules:** Some appointment types non-rescheduable (surgery, complex diagnostics)
**Audit Trail:** All changes logged with timestamp and reason
**Notifications:** Care team alerted for concerning patterns`,
      sizeEstimate: 'M',
      status: 'ready_for_review',
      orderIndex: 2,
    },
  });

  // Stories for Feature 1
  const stories = [
    {
      parentId: feature1.id,
      title: 'Display upcoming appointments list',
      description: 'As a patient, I want to see a list of my upcoming appointments so I can plan my visits to Moorfields.',
      acceptanceCriteria: `Given I am logged into the patient portal
When I navigate to the Appointments section
Then I see a list of my upcoming appointments ordered by date
And each appointment shows the date, time, clinic name, and appointment type
And appointments within 7 days are highlighted
And I can see preparation instructions for each appointment`,
      technicalNotes: `**API:** GET /api/appointments?status=upcoming
**Data:** FHIR Appointment resource with Location and Practitioner references
**Performance:** < 2 seconds load time on 3G connection`,
      sizeEstimate: 'M',
    },
    {
      parentId: feature1.id,
      title: 'Show appointment details with accessibility info',
      description: 'As a patient with accessibility needs, I want to see detailed information about each appointment including site accessibility features.',
      acceptanceCriteria: `Given I am viewing my appointments list
When I select an appointment
Then I see full details including clinician name and specialty
And I see the clinic address with a map link
And I see accessibility information (wheelchair access, hearing loop, etc.)
And I can download the appointment to my calendar
And the page is fully navigable with keyboard only`,
      technicalNotes: `**Accessibility data:** From site configuration (static data)
**Calendar export:** iCal format (.ics file)
**Screen reader:** ARIA live regions for dynamic content`,
      sizeEstimate: 'M',
    },
    {
      parentId: feature1.id,
      title: 'View appointment history',
      description: 'As a patient, I want to see my past appointments with outcomes so I can track my eye care journey.',
      acceptanceCriteria: `Given I am on the Appointments page
When I select "Past appointments"
Then I see appointments from the last 2 years
And each shows the date, clinic, and outcome summary
And I can filter by date range or appointment type
And I can link to related clinic letters if available`,
      technicalNotes: `**API:** GET /api/appointments?status=completed&from={date}
**Data retention:** 2 years in portal, link to full record for older
**Letter linking:** Via document reference in Encounter`,
      sizeEstimate: 'S',
    },
    {
      parentId: feature2.id,
      title: 'Select appointment type to book',
      description: 'As a patient, I want to select from available appointment types so I can book the right kind of follow-up.',
      acceptanceCriteria: `Given I have bookable appointment types
When I start the booking process
Then I see only appointment types I am eligible to book
And each type shows a description of what to expect
And I cannot book appointment types flagged as "clinician-only"
And the interface works with screen readers`,
      technicalNotes: `**Eligibility API:** POST /api/appointments/check-eligibility
**Rules:** Based on last appointment outcome and clinical pathway
**Cache:** Eligibility cached for 1 hour`,
      sizeEstimate: 'S',
    },
    {
      parentId: feature2.id,
      title: 'View and select available appointment slots',
      description: 'As a patient, I want to see available appointment times so I can choose one that fits my schedule.',
      acceptanceCriteria: `Given I have selected an appointment type
When I view available slots
Then I see slots for the next 12 weeks grouped by week
And I can filter by site, day of week, and morning/afternoon
And each slot shows the date, time, and site name
And slots are refreshed in real-time as I browse
And I cannot select slots that become unavailable`,
      technicalNotes: `**API:** GET /api/appointments/slots?type={type}&from={date}&to={date}
**Real-time:** WebSocket for availability updates
**Slot lock:** Reserve for 10 minutes on selection`,
      sizeEstimate: 'M',
    },
    {
      parentId: feature2.id,
      title: 'Confirm and complete appointment booking',
      description: 'As a patient, I want to confirm my booking details and receive confirmation so I know my appointment is secured.',
      acceptanceCriteria: `Given I have selected an appointment slot
When I review and confirm the booking
Then I see a summary of date, time, site, and appointment type
And I can add notes for the clinical team
And I receive an email confirmation within 1 minute
And I receive an SMS confirmation if I have a mobile number
And the appointment appears in my list immediately`,
      technicalNotes: `**API:** POST /api/appointments/book
**Notifications:** Gov.UK Notify for email and SMS
**Idempotency:** Prevent duplicate bookings with idempotency key`,
      sizeEstimate: 'M',
    },
    {
      parentId: feature3.id,
      title: 'Reschedule an appointment',
      description: 'As a patient, I want to reschedule my appointment to a different time if my plans change.',
      acceptanceCriteria: `Given I have an upcoming appointment
When I choose to reschedule
Then I am shown available alternative slots
And I select a new slot following the booking flow
And I confirm the change with the old and new times shown
And I receive confirmation of the change
And the change is reflected in PAS within 5 minutes`,
      technicalNotes: `**API:** PUT /api/appointments/{id}/reschedule
**Validation:** Cannot reschedule within 24 hours of appointment
**Clinical flags:** Some types non-rescheduable`,
      sizeEstimate: 'M',
    },
    {
      parentId: feature3.id,
      title: 'Cancel an appointment with reason',
      description: 'As a patient, I want to cancel my appointment if I can no longer attend, providing a reason.',
      acceptanceCriteria: `Given I have an upcoming appointment
When I choose to cancel
Then I must select a cancellation reason from a list
And I see a warning about potential care impact
And I confirm the cancellation
And I receive confirmation of the cancellation
And I am prompted to rebook if clinically appropriate`,
      technicalNotes: `**API:** DELETE /api/appointments/{id}
**Reasons:** Configurable list for clinical audit
**Care alerts:** Notify care team for high-risk patients`,
      sizeEstimate: 'S',
    },
  ];

  for (let i = 0; i < stories.length; i++) {
    await prisma.workItem.create({
      data: {
        specId,
        parentId: stories[i]!.parentId,
        type: 'story',
        title: stories[i]!.title,
        description: stories[i]!.description,
        acceptanceCriteria: stories[i]!.acceptanceCriteria,
        technicalNotes: stories[i]!.technicalNotes,
        sizeEstimate: stories[i]!.sizeEstimate as 'S' | 'M' | 'L' | 'XL',
        status: 'ready_for_review',
        orderIndex: i,
      },
    });
  }

  // 8. Create health score
  console.log('8. Creating project health score...');
  await prisma.projectHealth.upsert({
    where: { projectId: MOORFIELDS_PROJECT_ID },
    update: {
      score: 88,
      level: 'excellent',
      briefScore: 100,
      glossaryScore: 92,
      prefsScore: 90,
      specsScore: 80,
      sourcesScore: 70,
      learningScore: 85,
      recommendations: [
        'Consider adding more clinical terminology to glossary',
        'Upload NHS Design System component documentation as context source',
        'Add accessibility testing requirements to preferences',
      ],
    },
    create: {
      projectId: MOORFIELDS_PROJECT_ID,
      score: 88,
      level: 'excellent',
      briefScore: 100,
      glossaryScore: 92,
      prefsScore: 90,
      specsScore: 80,
      sourcesScore: 70,
      learningScore: 85,
      recommendations: [
        'Consider adding more clinical terminology to glossary',
        'Upload NHS Design System component documentation as context source',
        'Add accessibility testing requirements to preferences',
      ],
    },
  });

  console.log('\n✅ Moorfields Patient Portal demo data seeded successfully!');
  console.log(`\nProject ID: ${MOORFIELDS_PROJECT_ID}`);
  console.log('Project: Moorfields Patient Portal');
  console.log('Spec: Patient Appointment Management');
  console.log('Work Items: 1 Epic, 3 Features, 8 Stories');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
