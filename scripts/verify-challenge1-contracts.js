const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contractsDir = path.join(root, "challenge-1/shared/contracts");

const requiredContracts = [
  {
    file: "programme-loan.schema.json",
    required: [
      "beneficiaryId",
      "loanId",
      "originalLoanAmount",
      "remainingLoanBalance",
      "originalApprovedRepaymentMonths",
      "remainingRepaymentMonths",
      "totalArrearsAmount",
      "unpaidInstallmentsCount",
      "currentMonthlyInstallment",
      "hasActiveReschedulingRequest"
    ]
  },
  {
    file: "financial-study.schema.json",
    required: [
      "caseId",
      "beneficiaryId",
      "currentSalary",
      "obligationsRatio",
      "currentInstallmentRatio",
      "maxAllowedDeductionAmount",
      "proposedMonthlyInstallment",
      "proposedDeductionRate",
      "proposedReschedulingMonths",
      "averageIncomePerFamilyMember",
      "twentyPercentRule",
      "repaymentPeriodRule",
      "recommendationPath",
      "confidenceScore",
      "escalationReasons",
      "auditEvents",
      "trustGateRequired",
      "finalAuthority"
    ]
  },
  {
    file: "document-completeness.schema.json",
    required: [
      "requiredDocuments",
      "submittedDocuments",
      "missingDocuments",
      "invalidDocuments",
      "documentCompletenessStatus",
      "correctionRequired",
      "correctionMessage"
    ]
  },
  {
    file: "assessment-result.schema.json",
    required: [
      "applicationStatus",
      "decisionStage",
      "recommendation",
      "citizenFacingStatus",
      "officerFacingSummary",
      "trustGateActionRequired",
      "auditSummary",
      "financialStudy"
    ]
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyContract(contract) {
  const filePath = path.join(contractsDir, contract.file);
  assert(fs.existsSync(filePath), `Missing contract: ${contract.file}`);
  const schema = loadJson(filePath);
  assert(schema.type === "object", `${contract.file} must describe an object`);
  assert(schema.properties && typeof schema.properties === "object", `${contract.file} missing properties`);
  for (const field of contract.required) {
    assert(schema.properties[field], `${contract.file} missing field: ${field}`);
  }
  return {
    file: contract.file,
    fieldsChecked: contract.required.length
  };
}

const verified = requiredContracts.map(verifyContract);

console.log("Challenge 1 contracts verified");
console.log(JSON.stringify({ verified }, null, 2));
