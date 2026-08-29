---
description: Guidelines and triggers for persistent memory retrieval and knowledge graph synchronization across Antigravity sessions.
trigger: always_on
---

# Persistent Memory & Context Retention System

## 1. Automatic Memory Synchronization
Antigravity uses the persistent memory subsystem (`@modelcontextprotocol/server-memory` and workspace knowledge base) to preserve context across sessions.

### Memory Recall (Read)
- **Session Start & Complex Tasks**: Query persistent memory or read workspace knowledge to retrieve previously established conventions, database configurations, environment credentials/endpoints, and architectural decisions.
- **Contextual Alignment**: Always verify if a requested pattern or configuration has an existing record before introducing duplicates or contradictory implementations.

### Memory Ingestion (Write & Update)
- **Project State & Setup**: When a major infrastructure change (e.g., PostgreSQL credentials, JWT auth structure, API endpoints, environment variables) is finalized, record the key fact or entity into persistent memory.
- **User Preferences**: Record user directives, preferred coding patterns, and workflow habits.
- **Session & Login State**: When persistent tokens, test accounts, or environment variables are configured, keep a persistent reference in project configuration files or memory entities without exposing raw sensitive production secrets.

## 2. Memory Best Practices
- Keep facts atomic, concise, and verifiable against current code.
- Invalidate and update stale memories whenever code contracts or environment settings change.
