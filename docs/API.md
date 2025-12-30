# API Reference

Base URL: `http://localhost:3001/api`

All endpoints require `Authorization: Bearer <token>` header except `/auth/login`.

---

## Authentication

### Login

```
POST /auth/login
```

Request:
```json
{
  "username": "tech.lead",
  "password": "lead123"
}
```

Response (200):
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr_123",
      "username": "tech.lead",
      "role": "lead"
    }
  }
}
```

### Get Current User

```
GET /auth/me
```

Response (200):
```json
{
  "data": {
    "id": "usr_123",
    "username": "tech.lead",
    "role": "lead"
  }
}
```

---

## Specs

### List Specs

```
GET /specs
```

Query params:
- `projectId` (required): Filter by project
- `status`: Filter by status
- `search`: Search by name

Response (200):
```json
{
  "data": [
    {
      "id": "spec_abc123",
      "name": "appointments-api.pdf",
      "status": "translated",
      "specType": "api-spec",
      "uploadedAt": "2024-12-30T10:00:00Z",
      "stats": {
        "epics": 2,
        "features": 8,
        "stories": 47
      }
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "pageSize": 20
  }
}
```

### Upload Spec

```
POST /specs
Content-Type: multipart/form-data
```

Form fields:
- `file`: Binary file (PDF, DOCX, YAML, JSON)
- `projectId`: Project UUID
- `specType`: "api-spec" | "requirements-doc" | "design-doc"

Response (201):
```json
{
  "data": {
    "id": "spec_abc123",
    "name": "appointments-api.pdf",
    "status": "uploaded",
    "createdAt": "2024-12-30T10:00:00Z"
  }
}
```

### Get Spec

```
GET /specs/:id
```

Response (200):
```json
{
  "data": {
    "id": "spec_abc123",
    "name": "appointments-api.pdf",
    "status": "translated",
    "specType": "api-spec",
    "stats": {
      "epics": 2,
      "features": 8,
      "stories": 47
    },
    "uploadedAt": "2024-12-30T10:00:00Z",
    "translatedAt": "2024-12-30T10:04:32Z"
  }
}
```

### Delete Spec

```
DELETE /specs/:id
```

Response (204): No content

### Extract Content

```
POST /specs/:id/extract
```

Response (202):
```json
{
  "data": {
    "message": "Extraction started",
    "specId": "spec_abc123"
  }
}
```

### Translate Spec

```
POST /specs/:id/translate
```

Response (202):
```json
{
  "data": {
    "message": "Translation started",
    "specId": "spec_abc123"
  }
}
```

### Get Work Items Tree

```
GET /specs/:id/workitems
```

Response (200):
```json
{
  "data": [
    {
      "id": "wi_epic1",
      "type": "epic",
      "title": "Appointment Management",
      "status": "draft",
      "children": [
        {
          "id": "wi_feat1",
          "type": "feature",
          "title": "Booking Flow",
          "children": [
            {
              "id": "wi_story1",
              "type": "story",
              "title": "Create appointment endpoint",
              "description": "As a clinician...",
              "acceptanceCriteria": "Given...\nWhen...\nThen...",
              "technicalNotes": "POST /appointments",
              "sizeEstimate": "M",
              "sources": [
                {
                  "sectionId": "sec_123",
                  "sectionRef": "3.2.1"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Export to Jira

```
POST /specs/:id/export
```

Request:
```json
{
  "jiraProjectKey": "MOF",
  "dryRun": false
}
```

Response (202):
```json
{
  "data": {
    "exportId": "exp_xyz789",
    "status": "in_progress"
  }
}
```

---

## Work Items

### Update Work Item

```
PATCH /workitems/:id
```

Request:
```json
{
  "title": "Updated title",
  "acceptanceCriteria": "Given...\nWhen...\nThen..."
}
```

Response (200):
```json
{
  "data": {
    "id": "wi_story1",
    "title": "Updated title",
    "updatedAt": "2024-12-30T11:00:00Z"
  }
}
```

### Move Work Item

```
POST /workitems/:id/move
```

Request:
```json
{
  "newParentId": "wi_feat2",
  "newOrderIndex": 3
}
```

### Split Work Item

```
POST /workitems/:id/split
```

Request:
```json
{
  "count": 2,
  "suggestedTitles": ["Part 1", "Part 2"]
}
```

### Merge Work Items

```
POST /workitems/merge
```

Request:
```json
{
  "itemIds": ["wi_story1", "wi_story2"],
  "mergedTitle": "Combined story"
}
```

---

## Jira Integration

### Start OAuth

```
GET /jira/auth
```

Response (200):
```json
{
  "data": {
    "authUrl": "https://auth.atlassian.com/authorize?..."
  }
}
```

### Get Connection Status

```
GET /jira/status
```

Response (200):
```json
{
  "data": {
    "connected": true,
    "siteName": "company.atlassian.net"
  }
}
```

### Disconnect

```
DELETE /jira/disconnect
```

Response (204): No content

---

## Error Responses

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Spec not found",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Invalid request |
| UNAUTHORIZED | 401 | Missing/invalid token |
| NOT_FOUND | 404 | Resource doesn't exist |
| TRANSLATION_FAILED | 500 | AI processing error |
| JIRA_ERROR | 502 | Jira API failure |

---

*Last updated: December 2024*
