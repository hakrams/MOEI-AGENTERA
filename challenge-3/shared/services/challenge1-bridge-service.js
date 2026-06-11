const path = require("path");
const { createChallenge1LiveStore } = require("../../../challenge-1/shared/services/live-store/challenge1-live-store");

function createChallenge1BridgeService(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, "../../..");
  const c1Store = createChallenge1LiveStore({ rootDir });

  function getHousingContext(customerId) {
    const applications = c1Store.readStore("applications");
    const application = applications.find(
      (a) => a.applicationId === customerId
        || a.customer?.identityRef === customerId
        || a.customer?.emiratesIdMasked === customerId
    );

    if (!application) {
      return {
        hasActiveHousingApplication: false,
        applicationId: null,
        applicationStatus: null,
        latestAssessmentStatus: null,
        missingDocuments: [],
        latestOfficerAction: null,
        approvalSealStatus: null,
        latestAuditSummary: null
      };
    }

    const assessmentRuns = c1Store.readStore("assessmentRuns");
    const applicationId = application.applicationId;
    const latestAssessment = assessmentRuns
      .filter((r) => r.applicationId === applicationId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

    const documents = c1Store.readStore("documents");
    const appDocs = documents.filter((d) => d.applicationId === applicationId);
    const missingDocuments = appDocs
      .filter((d) => d.status === "required" || d.status === "rejected")
      .map((d) => d.documentType);

    const officeActions = c1Store.readStore("officeActions");
    const latestAction = officeActions
      .filter((a) => a.applicationId === applicationId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

    const approvalSeals = c1Store.readStore("approvalSeals");
    const seal = approvalSeals.find((s) => s.applicationId === applicationId) || null;

    const auditEvents = c1Store.readStore("auditEvents");
    const latestAudit = auditEvents
      .filter((e) => e.applicationId === applicationId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

    return {
      hasActiveHousingApplication: true,
      applicationId,
      applicationStatus: application.status || null,
      latestAssessmentStatus: latestAssessment ? latestAssessment.status : null,
      missingDocuments,
      latestOfficerAction: latestAction ? `${latestAction.actionType}: ${latestAction.note || ""}`.trim() : null,
      approvalSealStatus: seal ? seal.status : "not_requested",
      latestAuditSummary: latestAudit ? `${latestAudit.eventType} at ${latestAudit.createdAt}` : null
    };
  }

  function health() {
    try {
      const c1Health = c1Store.health();
      return {
        status: c1Health.status,
        checkedAt: new Date().toISOString(),
        c1Stores: c1Health.stores
      };
    } catch (error) {
      return {
        status: "degraded",
        checkedAt: new Date().toISOString(),
        error: error.message
      };
    }
  }

  return { getHousingContext, health };
}

module.exports = { createChallenge1BridgeService };
