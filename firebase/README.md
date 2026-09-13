# Firebase Infrastructure & Database Management

**Owner**: Developer 2 — Friend (Backend & Database Lead)

This directory contains the authoritative configuration, security rules, and index definitions for SkillBridge's Cloud Firestore database and Firebase services.

---

## Files

- `firestore.rules`: Authoritative Firestore Security Rules enforcing role-based access control (Student, Paid Company, Unpaid Company, Admin), prevent score forgery, and safeguard candidate profiles.
- `firestore.indexes.json`: Composite index definitions for Firestore queries.
- `firebase.json`: Standalone Firebase configuration for CLI operations within this directory.

---

## Deployment & Validation

### 1. Validate Rules Locally
```bash
# Start local Firebase emulators
npm run emulators
```

### 2. Deploy Rules to Production Firestore (`skillbridge-4101d`)
```bash
# Deploy only firestore security rules
firebase deploy --only firestore:rules

# Deploy composite indexes
firebase deploy --only firestore:indexes
```

---

## Ownership Rules
- Changes to `firestore.rules` or `firestore.indexes.json` must be approved by Developer 2 (Friend).
- No frontend developer should bypass or weaken Firestore security rules.
