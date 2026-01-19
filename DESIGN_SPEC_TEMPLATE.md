# Design Specification Template

> Copy this file and fill in for each new project.

---

# Design Specification & Project Signature

> **Project:** [Project Name]
> **Version:** [x.x.x]
> **Date:** [Month Year]
> **Author:** [Your Name]

---

## Project Signature

| Attribute | Value |
|-----------|-------|
| **Name** | [Project Name] |
| **Type** | [web app / CLI / desktop / mobile / library] |
| **Primary Language** | [TypeScript / Python / Go / etc.] |
| **Framework** | [Next.js / Django / etc.] |
| **Target Platforms** | [Web, iOS, Windows, etc.] |
| **Architecture Style** | [monolith / microservices / serverless / client-server] |
| **Primary Protocol** | [REST / GraphQL / WebSocket / gRPC] |
| **LOC (approx)** | [~X,XXX] |
| **Dependencies** | [X production, Y dev] |
| **Build Output** | [Docker image / npm package / binary / etc.] |

### One-Liner
> [One sentence describing what this project does]

### Elevator Pitch
> [2-3 sentences explaining the project's value proposition]

---

## Problem Statement

### The Problem
[What pain point or need does this address? Be specific.]

### User Needs
- [Need 1]
- [Need 2]
- [Need 3]

### Constraints
- [Constraint 1 - technical, business, or regulatory]
- [Constraint 2]
- [Constraint 3]

---

## Solution Overview

### High-Level Approach
[Describe the solution strategy in 2-3 paragraphs]

### Key Innovation
[What makes this solution unique or effective?]

---

## Architecture

### System Context Diagram

```
[ASCII diagram showing external systems and how they connect]

Example:
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Server  │────▶│ Database │
└──────────┘     └──────────┘     └──────────┘
```

### Container Diagram

```
[ASCII diagram showing major components within the system]
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| [Name] | [What it does] | [Stack] |
| [Name] | [What it does] | [Stack] |

---

## Technology Decisions

### DR-001: [Decision Title]

**Context:** [What situation required a decision?]

**Decision:** [What was decided?]

**Rationale:**
- [Reason 1]
- [Reason 2]

**Alternatives Considered:**
- [Alternative 1] - [why not chosen]
- [Alternative 2] - [why not chosen]

**Consequences:**
- (+) [Positive outcome]
- (-) [Negative tradeoff]

---

### DR-002: [Decision Title]

[Repeat format for each major decision]

---

### Technology Stack Summary

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | [Tech] | [Brief reason] |
| **Backend** | [Tech] | [Brief reason] |
| **Database** | [Tech] | [Brief reason] |
| **Infrastructure** | [Tech] | [Brief reason] |

---

## Data Flow

### Flow 1: [Primary User Flow]

```
1. [Step 1]
2. [Step 2]
3. [Step 3]
...
```

**Latency:** [Expected timing]

### Flow 2: [Secondary Flow]

[Repeat format]

### Data Structures

```typescript
// Key data models
interface [MainEntity] {
  [field]: [type];
}
```

---

## Component Specifications

### [Component Name]

**Purpose:** [One sentence]

**Public Interface:**
```typescript
class [ComponentName] {
  [method signature]
  [method signature]
}
```

**State:**
- [State item 1]
- [State item 2]

---

## API Contracts

### [Endpoint 1]

**Method:** [GET/POST/PUT/DELETE]
**Path:** [/api/resource]
**Purpose:** [What it does]

**Request:**
```json
{
  "field": "type"
}
```

**Response:**
```json
{
  "field": "type"
}
```

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| [Threat 1] | [How addressed] |
| [Threat 2] | [How addressed] |

### Authentication & Authorization
[Describe auth approach]

---

## Performance Considerations

### Targets
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]

### Optimizations Implemented
1. [Optimization 1]
2. [Optimization 2]

### Metrics to Monitor
- [Metric 1]
- [Metric 2]

---

## Deployment

### Development
```bash
[Commands to run locally]
```

### Production
```bash
[Commands to build/deploy]
```

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| [VAR_NAME] | [What it's for] | [Yes/No] |

---

## Future Considerations

### Potential Enhancements
1. [Enhancement 1]
2. [Enhancement 2]

### Technical Debt
1. [Debt item 1]
2. [Debt item 2]

### Migration Paths
- If [X] deprecated: [Alternative]

---

## Lessons Learned

### What Worked Well
1. [Success 1]
2. [Success 2]

### What Was Challenging
1. [Challenge 1]
2. [Challenge 2]

### Recommendations for Similar Projects
1. [Recommendation 1]
2. [Recommendation 2]

---

## Appendix A: File Structure

```
project-name/
├── src/
│   └── [describe structure]
├── [other directories]
└── [config files]
```

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| [Term 1] | [Definition] |
| [Term 2] | [Definition] |

---

*Document created: [Date]*
*Template version: 1.0*
