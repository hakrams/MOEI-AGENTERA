const { assert, requestJson, withServer } = require("./challenge1-live-api-test-client");

const port = Number(process.env.TEST_PORT || 9721);

async function main() {
  await withServer(port, async () => {
    const reset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
    assert(reset.statusCode === 200, `reset failed with ${reset.statusCode}`);

    const empty = await requestJson(port, "GET", "/api/challenge-1/test/empty-state");
    assert(empty.statusCode === 200, `empty-state returned ${empty.statusCode}`);
    assert(empty.body.empty === true, "live stores are not empty");

    const nonEmptyStores = Object.entries(empty.body.counts).filter(([, count]) => count !== 0);
    assert(nonEmptyStores.length === 0, `expected zero live records, found ${JSON.stringify(nonEmptyStores)}`);

    const health = await requestJson(port, "GET", "/api/challenge-1/health");
    assert(health.statusCode === 200, `health failed with ${health.statusCode}`);
    assert(health.body.status === "ok", "health is not ok");
  });

  console.log("Challenge 1 live empty-state verifier passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
