# Firestore Security Specification - Startup Garage

## Data Invariants
1. `Startup` objects must always have an `ownerId` that matches the authenticated user.
2. Sub-resources (Roadmaps, Chats, Pitches) must be nested under a `Startup` document that the user owns.
3. Timestamps (`createdAt`, `updatedAt`) must be strictly server-validated.
4. User profiles can only be created/updated by the user themselves.

## The "Dirty Dozen" Payloads (Targeted for Denial)

1. **Identity Spoofing**: Attempting to create a startup with someone else's `ownerId`.
2. **Path Injection**: Injecting a 1MB string as `startupId`.
3. **Ghost Field Update**: Adding `isAdmin: true` to a user profile.
4. **Relational Break**: Creating a Roadmap step for a startup that doesn't exist.
5. **Orphaned Write**: Creating a Chat message for a startup the user doesn't own.
6. **Immutable Tampering**: Attempting to change `createdAt` on a startup update.
7. **Size Attack**: Sending a roadmap step with 10,000 tasks inside the array.
8. **Regex Bypass**: Using special characters in IDs to attempt path traversal.
9. **Status Shortcut**: Moving a startup directly from 'idea' to 'scaling' without model validation (though strictly, we'll allow fields based on ownership, but we could enforce state transitions if needed).
10. **Resource Exhaustion**: Sending 1MB of text in a task title.
11. **PII Leak**: Querying for all user emails while signed in as a different user.
12. **System Field Hijack**: Attempting to set `healthScore` manually without following the AI's logic (though client-side logic is allowed, the rule ensures only the owner can write it).

## Red Team Evaluation Strategy
- Every `allow update` must use `affectedKeys().hasOnly()`.
- Every `allow list` must have a relational `resource.data` check.
- `isValidId` on all path variables.
- `get()` lookup for sub-collection Master Gate.
