<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0 (MINOR - new principles added)
Modified principles: None
Added sections:
  - Principle VI: Security & Secrets Protection (NEW)
  - Principle VII: AWS-Ready Architecture (NEW)
  - Principle VIII: Frontend/Backend Separation (NEW)
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ compatible (Constitution Check section exists)
  - .specify/templates/spec-template.md: ✅ compatible (requirements structure aligns)
  - .specify/templates/tasks-template.md: ✅ compatible (phase structure supports principles)
Follow-up TODOs: None
-->

# Music Game Constitution

## Core Principles

### I. Code Quality First

All code MUST be readable, maintainable, and follow established patterns. Code reviews are mandatory before merging. Technical debt MUST be tracked and addressed within the same release cycle when possible.

**Rationale**: A game project accumulates complexity quickly. Without strict quality standards, velocity degrades exponentially as the codebase grows.

### II. Test-Driven Development

Tests MUST be written before implementation for all business logic and game mechanics. The Red-Green-Refactor cycle is the standard workflow. Test coverage MUST meet minimum thresholds: 80% for core game logic, 60% for UI components.

**Rationale**: Games have complex state machines and edge cases. Tests prevent regressions that would otherwise surface as player-facing bugs.

### III. Incremental Delivery

Features MUST be developed in small, independently testable increments. Each increment MUST deliver demonstrable value. Avoid large PRs that bundle unrelated changes.

**Rationale**: Small increments enable faster feedback loops, easier debugging, and more predictable delivery schedules.

### IV. Performance Awareness

Performance implications MUST be considered during design and implementation. Frame rate targets and memory budgets MUST be defined upfront. Performance regressions MUST be caught before merge through automated benchmarks or manual testing.

**Rationale**: Games are performance-sensitive applications. Performance problems discovered late are expensive to fix and may require architectural changes.

### V. Simplicity Over Cleverness

Choose the simplest solution that meets requirements. Avoid premature optimization and over-engineering. YAGNI (You Aren't Gonna Need It) applies—implement only what is needed now.

**Rationale**: Clever solutions create maintenance burden. Simple code is easier to debug, extend, and onboard new contributors to.

### VI. Security & Secrets Protection

Secrets, tokens, API keys, and personal data MUST NEVER be:
- Stored in source code or configuration files committed to version control
- Output to logs, console, or any observable medium
- Committed to any branch (including feature branches)

All sensitive data MUST be managed via environment variables or secure secret management services (e.g., AWS Secrets Manager, Parameter Store). `.gitignore` MUST include patterns for `.env`, credentials files, and any potential secret-containing files.

**Rationale**: Security breaches from leaked credentials are catastrophic and irreversible. A production service handling user data has legal and ethical obligations to protect sensitive information.

### VII. AWS-Ready Architecture

All system design MUST consider AWS deployment from the start. This includes:
- Stateless application design for horizontal scaling
- Use of managed services where appropriate (RDS, ElastiCache, S3, CloudFront)
- Infrastructure as Code (IaC) for reproducible deployments
- Environment-based configuration (dev/staging/production)
- Health checks and graceful shutdown for container orchestration

**Rationale**: Retrofitting cloud-native patterns is expensive. Designing for AWS from day one ensures smooth production deployment and operational excellence.

### VIII. Frontend/Backend Separation

Frontend and backend MUST be clearly separated:
- **Backend**: API-only (REST or GraphQL), no HTML rendering, stateless
- **Frontend**: Standalone SPA or static assets, communicates only via API
- **Contracts**: API contracts MUST be defined and versioned independently
- **Deployment**: Frontend and backend MUST be independently deployable

Directory structure MUST reflect this separation:
```
backend/   # API server, business logic, data access
frontend/  # UI application, assets, client-side logic
```

**Rationale**: Clear separation enables independent scaling, deployment, and team ownership. It also allows frontend to be served via CDN for optimal performance.

## Development Standards

- **Code Style**: Follow language-specific style guides (enforced via linter)
- **Commits**: Use conventional commit format; each commit MUST be atomic and buildable
- **Branching**: Feature branches from main; PRs required for all changes
- **Documentation**: Public APIs and complex algorithms MUST have inline documentation
- **Dependencies**: New dependencies require justification; prefer standard library solutions
- **Secrets**: Use `.env.example` for documenting required environment variables (without values)

## Quality Gates

All changes MUST pass these gates before merge:

1. **Lint Check**: Zero linter errors or warnings
2. **Type Check**: Full type safety (if applicable to language)
3. **Unit Tests**: All tests pass; coverage thresholds met
4. **Build**: Clean build with no warnings treated as errors
5. **Review**: At least one approval from a code owner
6. **Secrets Scan**: No secrets or sensitive data detected in diff

## Governance

This Constitution supersedes all other development practices in the project. All PRs and code reviews MUST verify compliance with these principles.

**Amendment Process**:
1. Propose amendment via PR to this document
2. Document rationale and migration plan for breaking changes
3. Obtain team consensus before merge
4. Update version following semantic versioning

**Versioning Policy**:
- MAJOR: Principle removal or incompatible redefinition
- MINOR: New principle or significant expansion
- PATCH: Clarifications and non-semantic refinements

**Compliance Review**: Conducted at the start of each development cycle to ensure practices align with the Constitution.

**Version**: 1.1.0 | **Ratified**: 2025-01-17 | **Last Amended**: 2025-01-17
