rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Catch-all deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Global Helpers
    function isSignedIn() { return request.auth != null; }
    function isValidId(id) { return id is string && id.size() <= 128; }

    // Check if the user is in owner emails list
    function isHardcodedOwner() {
      return isSignedIn() && (request.auth.token.email in ["wsh020264@gmail.com", "mohammadali1997mo@gmail.com"]);
    }

    // Check if a document exists in 'admins' collection with current user's UID and role is owner or admin
    // OR if the user is a hardcoded owner
    function isAdmin() { 
      return isSignedIn() && (
        isHardcodedOwner() ||
        exists(/databases/$(database)/documents/admins/$(request.auth.uid))
      );
    }

    function isOwner() {
      return isSignedIn() && (
        isHardcodedOwner() ||
        (exists(/databases/$(database)/documents/admins/$(request.auth.uid)) && 
         get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'owner')
      );
    }

    // Users Collection
    match /users/{userId} {
      allow get: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow list: if isAdmin();
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if (isSignedIn() && request.auth.uid == userId) || isAdmin();
    }

    // Invoices / Deposits Collection
    match /invoices/{invoiceId} {
      allow get, list: if isSignedIn() && (
        resource.data.uid == request.auth.uid || 
        resource.data.userEmail == request.auth.token.email || 
        isAdmin()
      );
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    // Stats Collection
    match /stats/{sectionId} {
      allow get, list: if isAdmin();
      allow create, update: if true; // Public visitor tracking
    }

    // Visitor Sessions Collection
    match /visitor_sessions/{sessionId} {
      allow get: if isSignedIn() && (resource == null || resource.data.uid == request.auth.uid || isAdmin());
      allow list: if isAdmin();
      allow create, update: if true; // Public analytics mapping
    }

    // Withdrawals Collection
    match /withdrawals/{withdrawalId} {
      allow get, list: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if isAdmin();
    }

    // Notifications Collection
    match /notifications/{notificationId} {
      allow get, list: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow create: if isAdmin();
      allow update: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }

    // Prices Collection
    match /prices/{priceId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Settings Collection
    match /settings/{settingsId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Admins Collection (Only readable by admins, managed by owner)
    match /admins/{adminId} {
      allow read, list: if isAdmin();
      allow write: if isOwner();
    }
  }
}
