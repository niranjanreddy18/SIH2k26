---
name: persistent-memory
description: Manage, query, store, and sync persistent memory, entities, relations, session context, and developer preferences across Antigravity sessions.
---

# Persistent Memory Skill

This skill enables Antigravity to retain and manage long-term semantic and entity-based memory across chat sessions and development tasks.

## 1. Capabilities
- **Knowledge Graph Storage**: Store entities, relations, observations, and key project metadata.
- **Session Continuity**: Retain architectural decisions, active port configurations, database connection parameters, and authentication configurations across restarts.
- **User Preference Preservation**: Maintain user coding conventions, tool preferences, and project guidelines.

## 2. Workflows

### Recalling Context
When starting a task or when context is ambiguous:
1. Search persistent entities for relevant keywords (e.g., `auth_setup`, `database_config`, `api_contract`).
2. Retrieve related observations and relations.
3. Apply the context to the active development task.

### Recording New Memories
When completing setup steps, establishing standards, or receiving user corrections:
1. Identify the core entity (e.g., `SIH26_Database`, `JWT_Auth_Config`, `User_Preference`).
2. Formulate clear, atomic observations describing the setup or preference.
3. Save the entity and observations into the persistent memory store.

### Updating & Purging Stale Memories
If an environment variable or endpoint changes:
1. Locate the existing memory entry.
2. Update the observation with the new configuration.
3. Remove or supersede contradictory past observations.
