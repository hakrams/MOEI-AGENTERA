"use strict";

function createDdaAuditService({ store }) {
  function nextAuditId(events) {
    return `DDA-AUD-${String(events.length + 1).padStart(4, "0")}`;
  }

  function append(event) {
    const events = store.readStore("audit");
    const auditEvent = {
      auditId: nextAuditId(events),
      timestamp: new Date().toISOString(),
      actor: "system",
      result: "success",
      ...event
    };
    store.writeStore("audit", [...events, auditEvent]);
    return auditEvent;
  }

  function list(limit = 100) {
    return store.readStore("audit")
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  return { append, list };
}

module.exports = { createDdaAuditService };
