# Prompt for Claude Code: Set Up Moorfields API Integration Project in Handoff AI

## Your Task

Create and configure a project in Handoff AI called "Moorfields API Integration" with all the context needed for high-quality AI translation of specs. This includes:

1. **Project** with name and description
2. **Project Brief** (comprehensive knowledge base)
3. **Glossary** (30+ domain terms)
4. **Preferences** (how stories should be formatted)
5. **Templates** (for different work item types)
6. **Reference Documents** (supporting context)

Do NOT create specs, work items, or stories. Those will come when the user uploads actual specification documents for translation.

---

## 1. Create Project

```json
{
  "name": "Moorfields API Integration (MoorConnect)",
  "description": "Integration of OpenEyes ophthalmology clinical system with Meditech Expanse EPR via Mirth Connect middleware. 45 interfaces covering patient demographics, clinical data, appointments, and pharmacy. NHS hospital environment with HL7 v2.x messaging and REST APIs.",
  "jiraProjectKey": "MOOR",
  "settings": {
    "defaultSpecType": "api-spec",
    "autoTranslate": false,
    "notifyOnComplete": true
  }
}
```

---

## 2. Project Brief (Knowledge Base)

Create this as the project brief. This is the most important context for AI translation.

```markdown
# Moorfields API Integration (MoorConnect)

## Executive Summary

MoorConnect is a comprehensive integration programme connecting OpenEyes, a specialist ophthalmology electronic medical record system, with Meditech Expanse, the hospital-wide Electronic Patient Record (EPR) system at Moorfields Eye Hospital NHS Foundation Trust. The integration uses Mirth Connect as middleware via the Rhapsody Trust Integration Engine (TIE).

This project delivers 45 interfaces covering the full patient journey: demographics, appointments, clinical episodes, diagnoses, allergies, medications, and clinical documentation. The integration must handle bidirectional data flows, maintaining data consistency across systems while respecting each system's data model and clinical workflow.

## Business Context

Moorfields Eye Hospital is a world-leading specialist eye hospital. OpenEyes is purpose-built for ophthalmology with features like EyeDraw (clinical drawing), visual acuity tracking, and ophthalmic-specific examination workflows. Meditech Expanse is the Trust's chosen EPR for hospital-wide patient administration.

The integration ensures:
- Single patient record across clinical and administrative systems
- Real-time appointment and demographic synchronisation
- Clinical safety through allergy and alert sharing
- Referral to Treatment (RTT) pathway tracking for NHS waiting list management
- Pharmacy integration for prescribing safety

## Technical Architecture

### System Components

**OpenEyes** - Ophthalmology clinical system
- REST APIs for data exchange
- Event-driven outbound notifications via webhooks
- Patient-centric data model with episode-based clinical records
- Developed and maintained by ToukanLabs

**Meditech Expanse** - Hospital EPR
- HL7 v2.x messaging (ADT, SIU, PPR, MFN message types)
- Registration, scheduling, and pharmacy modules
- Master patient index and enterprise scheduling

**Mirth Connect / Rhapsody TIE** - Integration middleware
- Message transformation (HL7 to JSON, JSON to HL7)
- Routing and orchestration
- Error handling and retry logic
- Audit logging

### Integration Pattern: Trigger and Pull

The standard pattern for all interfaces:
1. Source system sends lightweight notification to Rhapsody (patient MRN + event type)
2. Rhapsody calls back to source system API to retrieve full payload
3. Rhapsody transforms data to target format
4. Rhapsody delivers to target system
5. Acknowledgement flows back through the chain

This pattern reduces payload size in notifications and ensures Rhapsody always has current data.

### HL7 Message Types Used

| Direction | HL7 Type | Purpose |
|-----------|----------|---------|
| Meditech → OpenEyes | ADT^A04 | New patient registration |
| Meditech → OpenEyes | ADT^A08 | Patient demographics update |
| Meditech → OpenEyes | ADT^A31 | Update person information |
| Meditech → OpenEyes | ADT^A40 | Patient merge |
| Meditech → OpenEyes | ADT^A60 | Allergy information (with AL1) |
| Meditech → OpenEyes | SIU^S12-S26 | Appointment scheduling |
| Meditech → OpenEyes | MFN | Formulary updates |
| OpenEyes → Meditech | ADT^A60 | Allergy updates (with IAM) |
| OpenEyes → Meditech | PPR^PC1 | Problem list updates (with PRB) |

### Key HL7 Segments

| Segment | Name | Content |
|---------|------|---------|
| MSH | Message Header | Message type, sending/receiving systems, timestamp |
| PID | Patient Identification | MRN, NHS number, name, DOB, gender, address |
| NK1 | Next of Kin | Associated persons, emergency contacts |
| AL1 | Allergy | Allergy substance, reaction, severity |
| IAM | Patient Adverse Reaction | Detailed allergy information (outbound) |
| DG1 | Diagnosis | Diagnosis code, description, type |
| PRB | Problem | Problem list entry details |
| OBX | Observation | Clinical observations, special indicators |
| PV1 | Patient Visit | Encounter/visit details |
| SCH | Scheduling | Appointment details |

## Interface Categories

### Critical (Must have for go-live)
- New Patient Creation (ADT^A04)
- Demographics Updates (ADT^A08, ADT^A31)
- Patient Merge (ADT^A40)
- Appointment Scheduling Inbound (SIU messages)
- Allergy Management Bidirectional (AL1/IAM)
- Problems/Diagnosis Bidirectional (DG1/PRB)
- RTT Outcomes

### Essential (Required for full operation)
- Risks and Alerts (OBX segments)
- Associated Persons / Next of Kin (NK1)
- Orders
- Formulary Updates (MFN)
- Drug/Pharmacy Management

### Important (Enhance clinical workflow)
- Document Management
- Special Indicators/Flags

## Data Domains

### Patient Demographics
Patient identity flows from Meditech (master) to OpenEyes. Updates are unidirectional. Fields include: MRN, NHS number, name, DOB, gender, address, contact details, GP registration.

### Clinical Data
Problems, allergies, and risks flow bidirectionally. OpenEyes is authoritative for ophthalmic diagnoses; Meditech holds the enterprise problem list. Reconciliation rules determine which system "wins" for conflicts.

### Coding Systems
- **Diagnoses**: OpenEyes uses SNOMED-CT; Meditech uses ICD-10. Mapping required in Rhapsody.
- **Allergies**: OpenEyes uses dm+d (dictionary of medicines and devices); Meditech uses internal codes.
- **Procedures**: OPCS-4 codes used in both systems.

### Appointments
Meditech Community Wide Scheduling (CWS) is the master for appointments. OpenEyes receives appointment notifications and can update attendance/outcome status.

## Key Technical Requirements

### Patient Matching
All interfaces require reliable patient matching:
- Primary identifier: MRN (Medical Record Number)
- Secondary identifier: NHS Number (10-digit with modulus 11 check)
- OpenEyes maintains internal patient ID mapped to MRN

### Idempotency
All APIs must handle duplicate messages gracefully. The same event may be delivered multiple times due to retry logic. Systems must not create duplicate records. Idempotency typically keyed on patient + entity type + source identifier.

### Error Handling
- Validation errors return immediately with specific error details
- Transient failures trigger automatic retry with exponential backoff
- Persistent failures route to dead letter queue for manual review
- All errors logged with correlation IDs for end-to-end tracing

### Acknowledgements
HL7 interfaces require ACK responses:
- AA (Application Accept): Message processed successfully
- AE (Application Error): Validation or processing failure
- AR (Application Reject): Message rejected, do not retry

### Audit Requirements
All clinical data changes must be logged with:
- Timestamp
- Source system
- User/service identity
- Before/after values
- Correlation ID

## Dependencies and Constraints

### External Dependencies
- Meditech RTT pathway interface not yet built (blocks RTT Outcomes work)
- Formulary approach depends on terminology service decision
- Several Change Requests (CRs) must be funded and scheduled

### Change Requests in Scope
| CR | Description | Status | Impact |
|----|-------------|--------|--------|
| CR-324 | RTT related | Complete | - |
| CR-325 | RTT data model design | Blocked - awaiting workshop | Blocks 90+ days of RTT work |
| CR-326 | RTT related | Complete | - |
| CR-327 | RTT read-only XAPI | Under T&M | Part of RTT |
| CR-329 | Allergies new data model | Unknown | Blocks allergy interface |
| CR-354 | Risks and Alerts | Complete | - |

### Timeline
- Contract: SOW-D, 6 months duration
- Target: March 2026 (contract milestone)
- Reality: ~20% of interfaces critical for March; extension to June likely
- Approach: Phased delivery with sandbox deployments

## Team Structure

### ToukanLabs (Vendor)
- OpenEyes development and API implementation
- Mirth Connect channel configuration (shared responsibility)
- Testing and deployment support
- Key contacts: Tim (CTO), Tom (Dev Manager), Mike (Tech Lead), Sami (UK Dev Lead)

### Moorfields Eye Hospital (Client)
- Meditech configuration
- Rhapsody middleware operation
- UAT and clinical validation
- Go-live support
- Key contact: Ryan Lynch (Project Manager)

## Success Criteria

1. All Critical interfaces deployed to production
2. Zero data loss in message processing
3. <500ms response time for synchronous APIs
4. 99.9% message delivery success rate
5. Full audit trail for all clinical data changes
6. Successful UAT sign-off from clinical users
```

---

## 3. Glossary (30+ Terms)

Create all of these glossary terms with the exact structure shown:

### Systems

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| OpenEyes | Open-source electronic medical record system specifically designed for ophthalmology. Features include EyeDraw clinical drawing, visual acuity tracking, ophthalmic examination workflows, and integration capabilities. Developed and supported by ToukanLabs. | OE | Systems | EMR, clinical system |
| Meditech Expanse | Enterprise hospital EPR (Electronic Patient Record) system providing patient administration, scheduling, pharmacy, and clinical documentation. The Trust-wide system of record at Moorfields Eye Hospital. | Expanse, MT | Systems | PAS, hospital system |
| Mirth Connect | Open-source healthcare integration engine for HL7 message transformation and routing. Used within the Rhapsody TIE for OpenEyes-Meditech message processing. | Mirth | Systems | integration engine |
| Rhapsody TIE | Trust Integration Engine - the middleware layer operated by Moorfields that routes messages between clinical systems. Hosts Mirth Connect channels for HL7 transformation and message orchestration. | TIE, Rhapsody | Systems | middleware |

### Standards and Protocols

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| HL7 | Health Level Seven - standard protocol for healthcare data exchange. Version 2.x uses pipe-delimited segments (used in MoorConnect); FHIR uses JSON/XML. MoorConnect uses HL7 v2.5.1 for Meditech integration. | Health Level 7, HL7v2 | Standards | messaging protocol |
| SNOMED-CT | Systematized Nomenclature of Medicine Clinical Terms - comprehensive clinical terminology used in OpenEyes for diagnoses and clinical findings. More granular than ICD-10 with explicit relationships between concepts. | SNOMED | Standards | diagnosis codes |
| ICD-10 | International Classification of Diseases 10th Revision - WHO standard for diagnosis coding used in Meditech and for national NHS reporting. Less granular than SNOMED-CT. | ICD | Standards | diagnosis codes |
| dm+d | Dictionary of Medicines and Devices - NHS standard for medication and medical device identification. Used in OpenEyes for allergy substances and prescribing. Maintained by NHS Business Services Authority. | DMDM | Standards | drug codes |
| OPCS-4 | Office of Population Censuses and Surveys Classification of Interventions and Procedures version 4 - UK standard for surgical procedure coding used in both OpenEyes and Meditech. | OPCS | Standards | procedure codes |

### HL7 Message Types

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| ADT | Admit/Discharge/Transfer - HL7 message category for patient movement and demographic events. Subtypes include A01 (admit), A04 (register outpatient), A08 (update patient), A31 (update person), A40 (merge), A60 (allergy update). | Admit Discharge Transfer | HL7 | patient message |
| SIU | Scheduling Information Unsolicited - HL7 message category for appointment scheduling events. Subtypes include S12 (new booking), S13 (reschedule), S14 (modify), S15 (cancel), S26 (notification of modification). | | HL7 | appointment message |
| PPR | Patient Problem - HL7 message category for problem list management. PC1 subtype used for adding/updating problems. Contains PRB segments with problem details. | | HL7 | problem message |
| MFN | Master File Notification - HL7 message category for reference data updates. Used for formulary synchronisation from Meditech to OpenEyes. | | HL7 | master data message |
| ACK | Acknowledgement - HL7 response message confirming receipt and processing. AA = Application Accept (success), AE = Application Error (validation failure), AR = Application Reject (do not retry). | Acknowledgement | HL7 | response |

### HL7 Segments

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| MSH | Message Header segment - first segment in every HL7 message containing message type, sending/receiving applications, timestamp, and message control ID. | Message Header | HL7 Segments | header |
| PID | Patient Identification segment - contains patient demographics including MRN, NHS number, name, date of birth, gender, address, and contact details. Present in most ADT messages. | Patient ID Segment | HL7 Segments | patient segment |
| NK1 | Next of Kin segment - contains associated person details including relationship type, name, contact information, and emergency contact flag. Used for next of kin and emergency contacts. | Next of Kin Segment | HL7 Segments | contact segment |
| AL1 | Allergy segment - contains allergy information including allergen code/description, reaction type, severity level, and identification date. Used in inbound allergy messages. | Allergy Segment | HL7 Segments | allergy data |
| IAM | Patient Adverse Reaction Information segment - detailed allergy segment used in outbound messages with more fields than AL1 including onset date, reported by, and certainty. | | HL7 Segments | allergy segment |
| DG1 | Diagnosis segment - contains diagnosis information including code, description, coding system (ICD-10/SNOMED), diagnosis type, and diagnosing clinician. | Diagnosis Segment | HL7 Segments | diagnosis data |
| PRB | Problem segment - contains problem list entry details including problem ID, description, onset date, status, and managing provider. Used in PPR messages. | Problem Segment | HL7 Segments | problem data |
| OBX | Observation segment - contains clinical observations and results. Used in MoorConnect for special indicators and flags. Includes observation ID, value, and interpretation. | Observation Segment | HL7 Segments | observation data |
| PV1 | Patient Visit segment - contains encounter/visit information including visit number, patient class, attending provider, and location. | Patient Visit Segment | HL7 Segments | visit data |
| SCH | Scheduling Activity Information segment - contains appointment details including appointment ID, timing, duration, and appointment type. | Schedule Segment | HL7 Segments | appointment data |

### Identifiers

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| MRN | Medical Record Number - the primary patient identifier within Moorfields Eye Hospital. Assigned by Meditech and used across all systems for patient matching. Unique within the Trust. | Medical Record Number, Hospital Number | Identifiers | patient ID |
| NHS Number | The unique 10-digit identifier for patients within the NHS. Used as secondary identifier and for cross-organisation data sharing. Validated using modulus 11 check digit algorithm. | | Identifiers | national ID |
| set_id | Sequence identifier within repeating HL7 segments. Used to track multiple instances of the same segment type (e.g., multiple allergies). Generated dynamically by Rhapsody, not persisted between messages. | Set ID, SI | Identifiers | sequence number |

### Clinical Terms

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| RTT | Referral to Treatment - NHS pathway tracking from initial GP referral to definitive treatment. Mandated for waiting list management and 18-week target compliance. Outcomes recorded using 10/20/30/90 series codes. | Referral to Treatment, 18 Week Pathway | Clinical | waiting list |
| Outcome | The clinical decision recorded at end of an appointment or episode. RTT outcomes determine pathway status (clock running, clock stopped). Includes next steps like follow-up booking or discharge. | Clinical Outcome | Clinical | result |
| Episode | A period of clinical care in OpenEyes, typically a single encounter or appointment. Contains examinations, diagnoses, treatments, and clinical notes specific to that visit. | Clinical Episode | Clinical | visit, encounter |
| EyeDraw | OpenEyes feature for clinical drawing of ophthalmic findings. Clinicians draw on standardised eye diagrams to record findings, which creates structured data from the annotations. | | Clinical | clinical drawing |

### Technical Terms

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| Webhook | HTTP callback triggered by an event in the source system. OpenEyes sends lightweight webhook notifications to Rhapsody containing patient MRN and event type to trigger the pull phase of integration. | | Technical | notification, callback |
| Trigger and Pull | Integration pattern where source system sends lightweight event notification (trigger), then target system retrieves full data via API callback (pull). Used for all MoorConnect interfaces to reduce message size and ensure data currency. | | Technical | event-driven |
| Idempotent | An operation that produces the same result regardless of how many times it is executed. Critical for integration APIs to handle duplicate messages safely without creating duplicate records. Typically keyed on patient + entity + source ID. | Idempotency | Technical | safe to retry |
| Correlation ID | Unique identifier passed through entire message flow for end-to-end tracing. Included in X-Correlation-ID header. Essential for debugging integration issues across multiple systems. | | Technical | trace ID |

### Project Terms

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| CR | Change Request - formal request for system modification tracked in the project. Each CR has defined scope, effort estimate, and funding status. Examples: CR-329 (Allergies), CR-325 (RTT). | Change Request | Project | ticket, enhancement |
| SOW | Statement of Work - contractual document defining project scope, deliverables, timeline, and payment terms. MoorConnect is currently on SOW-D in the contract sequence. | Statement of Work | Project | contract |
| UAT | User Acceptance Testing - formal testing by clinical end users to validate the system meets requirements before production go-live. MEH responsibility per SOW terms. | User Acceptance Testing | Project | user testing |
| Sandbox | Development and test environment where new interfaces are deployed for validation before production release. Project success measured by delivery of working code to sandbox. | | Technical | test environment, dev |
| Go-Live | The point at which a system or interface becomes operational in production. Requires successful UAT sign-off and operational readiness confirmation. | Golive, Go Live | Project | launch, release |
| Wraparound | The set of additional interface work items identified beyond original SOW scope. Tracked in the Wraparound List with priority categorisation (Critical, Essential, Important, Useful). | Wraparound List | Project | extras, additions |
| T-Shirt Sizing | Estimation methodology using relative sizes (XS, S, M, L, XL) to estimate development effort. XS = 0.5 days, S = 1 day, M = 1 week, L = 2 weeks, XL = 4 weeks. | T-Shirt Estimate | Project | story points |

### Interface Directions

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| Inbound | Data flow direction from Meditech to OpenEyes. Meditech sends HL7, Rhapsody transforms to JSON, OpenEyes receives via REST API. | Inbound Interface | Integration | incoming |
| Outbound | Data flow direction from OpenEyes to Meditech. OpenEyes sends webhook trigger, Rhapsody calls back for data, transforms to HL7, sends to Meditech. | Outbound Interface | Integration | outgoing |
| Bidirectional | Interface where data flows in both directions between systems. Requires careful consideration of system of record and conflict resolution. | Two-way | Integration | both ways |

### Meditech Specific

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| CWS | Community Wide Scheduling - Meditech module for enterprise appointment scheduling. Master system for appointment data in MoorConnect. | Community Wide Scheduling | Meditech | scheduling system |
| REG | Registration module in Meditech handling patient demographics and administrative data. Source of ADT messages for patient updates. | Registration | Meditech | admin system |
| PCS | Patient Care System - Meditech module for clinical documentation and nursing workflows. Source of medication administration data. | Patient Care System | Meditech | clinical system |
| MLLP | Minimal Lower Layer Protocol - TCP-based protocol for HL7 message transmission. Used for Rhapsody to Meditech communication. | | Technical | TCP |

### OpenEyes Specific

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| PAS API | Patient Administration System API - existing OpenEyes REST API for patient and appointment operations. Large portion reusable for MoorConnect. | | OpenEyes | patient API |
| Change Tracker | OpenEyes mechanism for recording data changes with audit trail. Used when recording clinical data updates via API. | | OpenEyes | audit log |
| Disorder | OpenEyes terminology for a clinical diagnosis or problem. Mapped from ICD-10/SNOMED codes via the diagnosis interface. | | OpenEyes | diagnosis, problem |

---

## 4. Preferences Configuration

```json
{
  "acFormat": "bullets",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "maxAcCount": 8,
  "verbosity": "balanced",
  "technicalDepth": "implementation",
  "customPrefs": [
    "Always specify the HL7 message type and relevant segments for inbound interfaces (e.g., 'Receives ADT^A08 messages with PID and AL1 segments')",
    "Include patient matching requirements in acceptance criteria - MRN as primary identifier, NHS number as fallback",
    "Reference the trigger-and-pull pattern for all outbound OpenEyes interfaces - webhook notification followed by API callback",
    "Specify idempotency handling for all create/update operations - include the idempotency key (typically patient + entity type + source ID)",
    "Include ACK response requirements for HL7 interfaces - AA for success, AE for validation failure with error details",
    "Note any CR dependencies that must be completed before development can begin (e.g., 'Depends on CR-329 completion')",
    "Include audit logging requirements for all clinical data changes - timestamp, source system, correlation ID",
    "Specify error handling approach: validation errors return immediately with details, transient failures retry with exponential backoff",
    "Reference SNOMED-CT for OpenEyes diagnoses and ICD-10 for Meditech - note mapping responsibility (typically Rhapsody)",
    "Include data isolation requirements - all queries scoped by patient MRN, no cross-patient data leakage",
    "Specify response time expectations: <500ms for synchronous API calls",
    "Clarify Rhapsody transformation responsibility vs OpenEyes API responsibility for each interface",
    "For bidirectional interfaces, specify which system is authoritative (system of record) for conflict resolution",
    "Include negative/empty state handling - e.g., 'No Known Allergies' vs empty allergy list",
    "Reference Meditech specification numbers where applicable (R1720 for ADT out, R1772 for ADT in)",
    "Specify message control ID usage for ACK correlation and duplicate detection"
  ]
}
```

---

## 5. Story Templates

### Template 1: Inbound API Endpoint (Meditech → OpenEyes)

```json
{
  "name": "Inbound API Endpoint",
  "isDefault": false,
  "acFormat": "bullets",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "customFields": [
    {
      "name": "hl7_message_type",
      "label": "Source HL7 Message Type",
      "type": "select",
      "required": true,
      "options": ["ADT^A04", "ADT^A08", "ADT^A31", "ADT^A40", "ADT^A60", "SIU^S12", "SIU^S13", "SIU^S14", "SIU^S15", "SIU^S26", "MFN", "Other"]
    },
    {
      "name": "hl7_segments",
      "label": "Relevant HL7 Segments",
      "type": "text",
      "required": true
    },
    {
      "name": "api_endpoint",
      "label": "OpenEyes API Endpoint",
      "type": "text",
      "required": true
    },
    {
      "name": "requires_patient_match",
      "label": "Requires Patient Matching",
      "type": "boolean",
      "required": true
    }
  ]
}
```

### Template 2: Outbound Webhook (OpenEyes → Rhapsody)

```json
{
  "name": "Outbound Webhook",
  "isDefault": false,
  "acFormat": "bullets",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "customFields": [
    {
      "name": "trigger_event",
      "label": "OpenEyes Trigger Event",
      "type": "text",
      "required": true
    },
    {
      "name": "rhapsody_endpoint",
      "label": "Rhapsody Notification Endpoint",
      "type": "text",
      "required": true
    },
    {
      "name": "callback_endpoint",
      "label": "OpenEyes Callback API",
      "type": "text",
      "required": true
    },
    {
      "name": "target_hl7_type",
      "label": "Target HL7 Message Type",
      "type": "text",
      "required": true
    }
  ]
}
```

### Template 3: HL7 to JSON Mapping

```json
{
  "name": "HL7 to JSON Mapping",
  "isDefault": false,
  "acFormat": "bullets",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "customFields": [
    {
      "name": "source_hl7_segment",
      "label": "Source HL7 Segment(s)",
      "type": "text",
      "required": true
    },
    {
      "name": "target_json_structure",
      "label": "Target JSON Structure",
      "type": "text",
      "required": true
    },
    {
      "name": "code_mapping_required",
      "label": "Code System Mapping Required",
      "type": "select",
      "required": true,
      "options": ["None", "SNOMED to ICD-10", "ICD-10 to SNOMED", "dm+d lookup", "Other"]
    }
  ]
}
```

### Template 4: Bidirectional Interface

```json
{
  "name": "Bidirectional Interface",
  "isDefault": true,
  "acFormat": "bullets",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "customFields": [
    {
      "name": "inbound_hl7_type",
      "label": "Inbound HL7 Message Type",
      "type": "text",
      "required": true
    },
    {
      "name": "outbound_hl7_type",
      "label": "Outbound HL7 Message Type",
      "type": "text",
      "required": true
    },
    {
      "name": "data_authority",
      "label": "System of Record",
      "type": "select",
      "required": true,
      "options": ["Meditech", "OpenEyes", "Both (reconciliation required)"]
    }
  ]
}
```

---

## 6. Reference Documents

Upload or create references to these document types. These provide additional context for AI translation.

### Document 1: Integration Architecture Overview

**Name:** MoorConnect Integration Architecture
**Type:** architecture
**Content to include:**
- Trigger-and-pull pattern explanation with sequence diagram
- System boundaries: what OpenEyes does vs what Rhapsody does vs what Meditech does
- Message flow for inbound (Meditech → Rhapsody → OpenEyes)
- Message flow for outbound (OpenEyes → Rhapsody → Meditech)
- Error handling and retry architecture
- Dead letter queue for persistent failures

### Document 2: HL7 Message Specifications

**Name:** HL7 v2.5.1 Message Reference for MoorConnect
**Type:** technical
**Content to include:**
- ADT message types: A01, A04, A08, A31, A40, A60 with segment structure
- SIU message types: S12, S13, S14, S15, S26 for scheduling
- PPR^PC1 for problem list
- MFN for master file (formulary) updates
- Segment definitions: MSH, PID, NK1, AL1, IAM, DG1, PRB, OBX, PV1, SCH, MRG
- Field-level mappings from Meditech specs R1720 and R1772

### Document 3: OpenEyes API Standards

**Name:** OpenEyes REST API Guidelines
**Type:** technical
**Content to include:**
- Authentication: API key in header
- Base URL structure: /api/v1/{resource}
- Standard error response format with error codes
- Pagination pattern for list endpoints
- Correlation ID header (X-Correlation-ID) for tracing
- Audit logging requirements

### Document 4: Data Mapping Reference

**Name:** Code System Mapping Guide
**Type:** technical
**Content to include:**
- SNOMED-CT to ICD-10 mapping approach for diagnoses
- ICD-10 to SNOMED-CT reverse mapping
- dm+d codes for allergy substances
- Contact role codes: Meditech values to OpenEyes values
- Diagnosis type mapping: W/F (Working/Final) to OpenEyes status
- Diagnosis classification: A/F/V mapping
- Special indicator mnemonics (VULN, etc.)

### Document 5: Project Dependencies and Blockers

**Name:** MoorConnect Dependencies Register
**Type:** process
**Content to include:**
- CR-329 (Allergies): New data model, funding status, impact on allergy interface
- CR-325 (RTT): Workshop requirement, blocks 90+ days of work
- CR-327 (RTT XAPI): Read-only API, under T&M
- CR-354 (Risks and Alerts): Status and OE-17199 dependency
- Meditech RTT pathway: Not yet implemented, blocks all RTT work
- Formulary approach: Terminology service vs CR-379 decision pending
- MEH technical questions: Outstanding clarifications list

### Document 6: Interface Priority Matrix

**Name:** MoorConnect Interface Prioritisation
**Type:** process
**Content to include:**
- Critical interfaces (must have for go-live): list with estimated effort
- Essential interfaces (required for full operation): list with dependencies
- Important interfaces (enhance workflow): list
- Useful interfaces (nice to have): list
- Blocked interfaces: what's blocking and owner
- Estimated total effort by category

---

## 7. Interface Inventory (Specs to be Uploaded)

When specs are uploaded for translation, they will cover these interfaces. This inventory helps the AI understand the full scope.

### Critical Interfaces

| Interface | Direction | HL7 Type | Spec Document | Status |
|-----------|-----------|----------|---------------|--------|
| New Patient Creation | Inbound | ADT^A04 | New_Patient_Creation_Inbound_to_OpenEyes.docx | Ready |
| Demographics Updates | Bidirectional | ADT^A08, A31 | Demographics_Updates.docx | Ready |
| Patient Merge | Bidirectional | ADT^A40, A34, A35 | Patient_Merge.docx | Ready |
| Appointments | Inbound | SIU^S12-S26 | Appointments_Inbound_to_OpenEyes.docx | Ready |
| Allergy Management | Bidirectional | ADT^A60, AL1/IAM | Allergy_Management.docx | Depends on CR-329 |
| Problems/Diagnosis Outbound | Outbound | PPR^PC1 | Problems_Outbound_OE_to_Expanse.docx | Ready |
| Diagnosis Inbound | Inbound | ADT^A08 + DG1 | Diagnosis_Inbound_to_OpenEyes.docx | Ready |
| RTT Outcomes | Outbound | TBD | RTT_Outcomes.docx | Blocked - Meditech |

### Essential Interfaces

| Interface | Direction | HL7 Type | Spec Document | Status |
|-----------|-----------|----------|---------------|--------|
| Risks and Alerts | Bidirectional | ADT^A08 + OBX | Special_Indicators_Flags.docx | Ready |
| Associated Persons | Bidirectional | NK1 segment | Associated_Persons_Updates.docx | Ready |
| Orders | TBD | TBD | Orders.docx | Needs scoping |
| Formulary Updates | Inbound | MFN | Pharmacy_Formulary_Management.docx | Blocked - decision |
| Drug/Pharmacy | Inbound | RDE, RAS, DFT | Drug_Pharmacy_Management_Inbound.docx | Ready |

### Important Interfaces

| Interface | Direction | HL7 Type | Spec Document | Status |
|-----------|-----------|----------|---------------|--------|
| Document Management | Bidirectional | MDM | Document_Management.docx | Ready |

---

## 8. Validation Checklist

Before completing setup, verify:

### Project
- [ ] Project created with name "Moorfields API Integration (MoorConnect)"
- [ ] Description mentions OpenEyes, Meditech, Mirth Connect, NHS, HL7
- [ ] Jira project key set to "MOOR"

### Project Brief
- [ ] Brief is 1500+ words
- [ ] Covers business context (Moorfields Eye Hospital, ophthalmology, NHS)
- [ ] Covers technical architecture (OpenEyes, Meditech, Rhapsody, HL7 v2.x)
- [ ] Lists interface categories (Critical, Essential, Important)
- [ ] Explains trigger-and-pull integration pattern
- [ ] Documents HL7 message types (ADT, SIU, PPR, MFN)
- [ ] Documents key HL7 segments (PID, NK1, AL1, DG1, PRB, OBX)
- [ ] Notes coding systems (SNOMED, ICD-10, dm+d)
- [ ] Notes dependencies and constraints (CRs, Meditech RTT)
- [ ] Includes success criteria

### Glossary
- [ ] 40+ terms defined (expanded from minimum 25)
- [ ] Systems covered: OpenEyes, Meditech, Mirth Connect, Rhapsody TIE
- [ ] Standards covered: HL7, SNOMED-CT, ICD-10, dm+d, OPCS-4
- [ ] HL7 message types covered: ADT, SIU, PPR, MFN, ACK
- [ ] HL7 segments covered: MSH, PID, NK1, AL1, IAM, DG1, PRB, OBX, PV1, SCH, MRG
- [ ] Identifiers covered: MRN, NHS Number, set_id
- [ ] Clinical terms covered: RTT, Outcome, Episode, EyeDraw
- [ ] Technical terms covered: Webhook, Trigger and Pull, Idempotent, Correlation ID, MLLP
- [ ] Project terms covered: CR, SOW, UAT, Sandbox, Go-Live, Wraparound, T-Shirt Sizing
- [ ] Interface directions covered: Inbound, Outbound, Bidirectional
- [ ] Meditech modules covered: CWS, REG, PCS
- [ ] OpenEyes specifics covered: PAS API, Change Tracker, Disorder
- [ ] Full definitions provided (not just acronym expansions)
- [ ] Aliases specified for common variants
- [ ] Avoid terms specified where appropriate
- [ ] Categories assigned for organisation

### Preferences
- [ ] AC format set to bullets
- [ ] Technical depth set to implementation
- [ ] Verbosity set to balanced
- [ ] 16 custom preferences defined
- [ ] Healthcare-specific preferences included (HL7, patient matching, ACK handling)
- [ ] Error handling preferences included
- [ ] Audit logging preferences included
- [ ] Bidirectional interface preferences included
- [ ] Negative state handling preferences included

### Templates
- [ ] Inbound API Endpoint template created with HL7 fields
- [ ] Outbound Webhook template created with trigger/callback fields
- [ ] HL7 to JSON Mapping template created
- [ ] Bidirectional Interface template created (set as default)
- [ ] All templates have appropriate custom fields
- [ ] All templates specify required sections

### Reference Documents
- [ ] Integration Architecture document referenced
- [ ] HL7 specification document referenced
- [ ] API standards document referenced
- [ ] Mapping guide document referenced
- [ ] Dependencies register document referenced
- [ ] Interface priority matrix document referenced

---

## Important Notes for AI Translation

When specs are uploaded and translated, the AI should:

1. **Use exact terminology from glossary** - "OpenEyes" not "the clinical system", "MRN" not "patient ID"

2. **Reference HL7 specifics** - Include message types (ADT^A08) and segments (PID, AL1) in descriptions

3. **Apply the integration pattern** - All outbound work should reference trigger-and-pull

4. **Include patient matching** - Every patient-related story needs MRN matching with NHS number fallback

5. **Specify idempotency** - All create/update operations need idempotency handling

6. **Note dependencies** - Flag CR dependencies where they exist (CR-329, CR-325)

7. **Include error handling** - Validation errors vs transient failures vs persistent failures

8. **Require audit logging** - All clinical data changes must be audited

9. **Set realistic sizes** - API endpoints are typically M, complex mappings are L, architectural work is XL

The quality of this context directly determines the quality of generated work items. Comprehensive glossary + clear preferences = stories that match team expectations.
