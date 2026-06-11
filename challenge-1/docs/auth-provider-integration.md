# Authentication Provider Integration

ArrearsFlow is built so the housing arrears workflow does not own the national
identity provider.

In this hackathon workspace, TrustGate is used as a standalone trust-provider
adapter for live testing of verified login and human approval. In a ministry
environment, the same boundary can be connected to UAE Pass or an internal IAM
provider.

## Integration Points

The MOEI application reads its authentication provider settings from:

```text
/runtime-config.js
```

The important runtime fields are:

```json
{
  "identityProvider": {
    "id": "trustgate",
    "name": "TrustGate",
    "baseUrl": "https://trustgate.example/",
    "loginResultParam": "trustGateResult",
    "mode": "standalone_trust_service"
  }
}
```

For UAE Pass or a ministry-owned provider, replace the runtime values and map
the provider callback into the same verified-person shape used by the customer
and office flows.

## Provider Responsibilities

The external provider should handle:

- verified customer login
- verified officer login
- officer privilege checks
- sensitive approval confirmation
- callback result integrity
- session expiry
- audit metadata for who authenticated or approved

## ArrearsFlow Responsibilities

ArrearsFlow keeps ownership of:

- housing arrears application intake
- programme loan feed intake
- document and financial assessment
- deterministic policy calculations
- recommendation status
- TrustGate/UAE Pass callback validation
- final audit trail and approval seal after a valid human approval callback

## Important Boundary

The authenticator does not calculate salary caps, repayment terms, policy
compliance, or the final assessment recommendation.

The financial engine does not create identity credentials or grant officer
privileges.

Production deployments should configure the provider through environment
variables or secure server config. Do not hardcode provider secrets, customer
records, or officer credentials in the submitted code package.
