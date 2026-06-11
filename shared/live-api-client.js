(function attachChallenge1LiveApi(root, factory) {
  const client = factory(root);

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.liveApi = client;
  }
})(typeof window !== "undefined" ? window : globalThis, function createChallenge1LiveApi(root) {
  const basePath = "/api/challenge-1";

  async function request(method, path, body) {
    const response = await root.fetch(`${basePath}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || payload.summary || `Challenge 1 API ${method} ${path} failed`);
      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  return {
    health: () => request("GET", "/health"),
    createApplication: (payload) => request("POST", "/applications", payload),
    getApplication: (applicationId) => request("GET", `/applications/${encodeURIComponent(applicationId)}`),
    addDocument: (applicationId, payload) => request("POST", `/applications/${encodeURIComponent(applicationId)}/documents`, payload),
    assess: (applicationId) => request("POST", `/applications/${encodeURIComponent(applicationId)}/assess`, {}),
    officeQueue: () => request("GET", "/office/queue"),
    officeAction: (payload) => request("POST", "/office/actions", payload),
    trustGateApprovalCallback: (payload) => request("POST", "/trustgate/approval-callback", payload),
    audit: (applicationId) => request("GET", `/audit/${encodeURIComponent(applicationId)}`),
    seal: (sealId) => request("GET", `/seals/${encodeURIComponent(sealId)}`)
  };
});
