{
  "entities": {
    "User": {
      "title": "User",
      "description": "Registered user in the store",
      "type": "object",
      "properties": {
        "uid": { "type": "string" },
        "email": { "type": "string" },
        "name": { "type": "string" },
        "referralCode": { "type": "string" },
        "lastActive": { "type": "string", "format": "date-time" },
        "registeredAt": { "type": "string", "format": "date-time" },
        "method": { "type": "string" }
      },
      "required": ["uid", "email", "name", "referralCode", "lastActive", "registeredAt", "method"]
    },
    "Invoice": {
      "title": "Invoice",
      "description": "Sales record of a transaction",
      "type": "object",
      "properties": {
        "orderId": { "type": "string" },
        "service": { "type": "string" },
        "amount": { "type": "string" },
        "qty": { "type": "string" },
        "pid": { "type": "string" },
        "idnum": { "type": "string" },
        "userName": { "type": "string" },
        "userEmail": { "type": "string" },
        "date": { "type": "string", "format": "date-time" },
        "paymentMethod": { "type": "string", "enum": ["stripe", "qr"] },
        "status": { "type": "string", "enum": ["paid", "pending"] }
      },
      "required": ["orderId", "service", "amount", "qty", "pid", "idnum", "userName", "userEmail", "date", "paymentMethod", "status"]
    },
    "Stats": {
      "title": "Stats",
      "description": "Usage statistics for site sections",
      "type": "object",
      "properties": {
        "section": { "type": "string" },
        "visitCount": { "type": "number" }
      },
      "required": ["section", "visitCount"]
    },
    "GlobalSettings": {
      "title": "GlobalSettings",
      "description": "Global store settings like exchange rates",
      "type": "object",
      "properties": {
        "exchangeRate": { "type": "number" }
      },
      "required": ["exchangeRate"]
    }
  },
  "firestore": {
    "/users/{userId}": {
      "schema": "User",
      "description": "User profiles"
    },
    "/invoices/{invoiceId}": {
      "schema": "Invoice",
      "description": "Transaction records"
    },
    "/stats/{sectionId}": {
      "schema": "Stats",
      "description": "Usage statistics"
    },
    "/settings/{settingsId}": {
      "schema": "GlobalSettings",
      "description": "Global config options"
    }
  }
}
