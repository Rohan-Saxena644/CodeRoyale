import { buildDriver, executionError, languageIds, outputsMatch, runOnJudge0 } from "../lib/judge";
import { cases, solution } from "../tests/judge-fixtures";

async function main() {
  let failed = 0;
  let passed = 0;
  const selected = process.argv.slice(2);
  for (const [language, id] of Object.entries(languageIds)) {
    if (selected.length && !selected.includes(language)) continue;
    for (const { type, value } of cases) {
      const driver = buildDriver(language, solution(language, type), "echo", [value], [{ name: "value", type }], type);
      const { data, error } = await runOnJudge0(driver.code, id, driver.stdin);
      const failure = error || (data ? executionError(data) : "No response");
      const ok = !failure && outputsMatch(data?.stdout ?? "", value);
      console.log(`${ok ? "PASS" : "FAIL"} ${language} ${type}${ok ? "" : `: ${failure || `unexpected output ${data?.stdout}`}`}`);
      if (ok) passed++; else failed++;
    }
  }
  console.log(`\nJudge0 live checks: ${passed} passed, ${failed} failed`);
  if (failed || !passed) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
