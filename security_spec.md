# Security Specification for Waseem Store

## Data Invariants
1. A user profile is only accessible by that specific user.
2. Invoices are created upon successful payment and should be readable only by admins or the creator.
3. System statistics are incremented by clients but only readable by admins.
4. Admins have full read access to all collections to monitor the store.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a user profile with someone else's UID.
2. **PII Leak**: Authenticated user attempts to read another user's profile.
3. **Ghost Invoice**: Attempt to update an invoice's status from 'paid' to 'refunded' if that status is not allowed.
4. **ID Poisoning**: Creating an invoice with a 2KB string as an ID.
5. **State Shortcut**: Updating an existing invoice's payment method or amount after it is settled.
6. **Self-Promotion**: Authenticated user attempts to write to the 'admins' collection to make themselves an admin.
7. **Negative Amount**: Creating an invoice with a negative amount.
8. **Shadow Field**: Creating a user with an `isAdmin: true` field when the schema doesn't allow it/rules should block it.
9. **Blanket Read Users**: Attempting to list all users without being an admin.
10. **Stat Reset**: Attempting to set a section's `visitCount` to 0.
11. **Expired Timestamp**: Creating a record with a `createdAt` in the past.
12. **Orphaned Invoice**: Creating an invoice without a valid user reference.

## Test Runner (Draft Rules First)
A full test runner would follow in `firestore.rules.test.ts`.
