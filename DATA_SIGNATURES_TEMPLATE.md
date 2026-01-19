# Data Signatures Template

> Copy this for new projects. Document all your data structures.

---

## How to Use This Template

For each data structure in your project, document:

1. **Name** - What the type is called
2. **Purpose** - One sentence explaining what it represents
3. **Signature** - Fields with types and constraints
4. **Example** - Real values showing the structure

### Signature Syntax

```
[TypeName]
  fieldName: type constraints    // Description
```

**Types:** `string`, `number`, `boolean`, `Date`, `TypeName`, `TypeName[]`

**Constraints:**
- `not null` - Required field
- `nullable` - Can be null
- `optional` - May not exist
- `literal` - Exact value (e.g., `"pending" literal`)
- `enum (a, b, c)` - One of listed values

---

## Domain Models

### [YourMainEntity]

[What this entity represents in your domain]

**Signature:**
```
YourMainEntity:
  id: UUID primary key
  name: string not null
  status: enum ("active", "inactive", "pending")
  createdAt: timestamp not null
  metadata: object optional
```

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Example Item",
  "status": "active",
  "createdAt": "2026-01-19T10:30:00Z"
}
```

---

### [RelatedEntity]

[What this represents and how it relates to main entity]

**Signature:**
```
RelatedEntity:
  id: UUID primary key
  parentId: UUID foreign key -> YourMainEntity
  value: number not null
  type: string not null
```

**Example:**
```json
{
  "id": "...",
  "parentId": "550e8400-e29b-41d4-a716-446655440000",
  "value": 42,
  "type": "metric"
}
```

---

## API Request/Response Models

### [POST /api/resource - Request]

**Signature:**
```
CreateResourceRequest:
  name: string not null (min 1, max 100)
  description: string optional
  tags: string[] optional
```

**Example:**
```json
{
  "name": "New Resource",
  "description": "Optional description",
  "tags": ["tag1", "tag2"]
}
```

---

### [POST /api/resource - Response]

**Signature:**
```
CreateResourceResponse:
  success: boolean not null
  data: YourMainEntity optional
  error: ErrorInfo optional

ErrorInfo:
  code: string not null
  message: string not null
```

**Example (success):**
```json
{
  "success": true,
  "data": { "id": "...", "name": "New Resource", ... }
}
```

**Example (error):**
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Name is required" }
}
```

---

## WebSocket/Event Models

### [EventName Message]

[When this event is sent and by whom]

**Signature:**
```
EventNameMessage:
  type: "eventName" literal
  payload: EventPayload not null
  timestamp: number not null

EventPayload:
  field1: string not null
  field2: number optional
```

**Example:**
```json
{
  "type": "eventName",
  "payload": { "field1": "value", "field2": 123 },
  "timestamp": 1737280000000
}
```

---

## Enums / Constants

### [StatusEnum]

```
Status:
  "pending"   // Initial state
  "active"    // Currently in use
  "completed" // Finished successfully
  "failed"    // Terminated with error
```

### [ConfigConstants]

```
MAX_ITEMS: 100
DEFAULT_TIMEOUT: 30000  // milliseconds
API_VERSION: "v1"
```

---

## Storage Keys

### LocalStorage
```
app-user-preferences: UserPreferences   // User settings
app-session-token: string               // Auth token
app-cached-data: CachedData[]           // Offline cache
```

### Session Storage
```
app-temp-state: TempState   // Non-persistent state
```

---

## Notes

- [Any special considerations about data formats]
- [Encoding notes, timezone handling, etc.]
- [Backward compatibility notes]

---

*Document your data structures as you build. Future you will thank present you.*
