/**
 * Quick test: run with `npx tsx app/dashboard/bank/onboarding/test-detection.ts`
 * Verifies detection algorithm against ground truth.
 */
import { allMockTransactions, EXPECTED_RECURRING_MERCHANTS, EXPECTED_NOT_RECURRING } from "./mock-transactions";
import { detectRecurringPatterns } from "./detect-recurring";

const detected = detectRecurringPatterns(allMockTransactions);
const detectedNames = new Set(detected.map((p) => p.merchantName));

console.log(`\n=== RECURRING PATTERN DETECTION TEST ===`);
console.log(`Total transactions: ${allMockTransactions.length}`);
console.log(`Patterns detected: ${detected.length}\n`);

console.log("── Detected Patterns ──────────────────────────");
for (const p of detected) {
  const variance = p.isVariableAmount ? " (variable amount)" : "";
  console.log(
    `  ✓ ${p.merchantName.padEnd(30)} ${p.frequencyLabel.padEnd(14)} ` +
    `kr ${Math.abs(p.avgAmount).toLocaleString("nb-NO").padStart(8)}  ` +
    `score: ${p.score.toFixed(2)}  (${p.transactions.length} txs)${variance}`
  );
}

console.log("\n── Expected Recurring ─────────────────────────");
let truePositives = 0;
let falseNegatives = 0;
for (const name of EXPECTED_RECURRING_MERCHANTS) {
  const found = detectedNames.has(name);
  console.log(`  ${found ? "✓" : "✗"} ${name.padEnd(30)} ${found ? "DETECTED" : "MISSED"}`);
  if (found) truePositives++;
  else falseNegatives++;
}

console.log("\n── Expected NOT Recurring ─────────────────────");
let trueNegatives = 0;
let falsePositives = 0;
for (const name of EXPECTED_NOT_RECURRING) {
  const found = detectedNames.has(name);
  console.log(`  ${found ? "✗" : "✓"} ${name.padEnd(30)} ${found ? "FALSE POSITIVE" : "CORRECTLY EXCLUDED"}`);
  if (!found) trueNegatives++;
  else falsePositives++;
}

// Any unexpected detections?
const expectedAll = new Set([...EXPECTED_RECURRING_MERCHANTS, ...EXPECTED_NOT_RECURRING]);
const unexpected = detected.filter((p) => !expectedAll.has(p.merchantName));
if (unexpected.length > 0) {
  console.log("\n── Unexpected Detections ──────────────────────");
  for (const p of unexpected) {
    console.log(
      `  ? ${p.merchantName.padEnd(30)} ${p.frequencyLabel.padEnd(14)} ` +
      `kr ${Math.abs(p.avgAmount).toLocaleString("nb-NO").padStart(8)}  score: ${p.score.toFixed(2)}`
    );
  }
}

console.log("\n── Summary ────────────────────────────────────");
const precision = truePositives / (truePositives + falsePositives);
const recall = truePositives / (truePositives + falseNegatives);
const f1 = 2 * (precision * recall) / (precision + recall);
console.log(`  True Positives:   ${truePositives}`);
console.log(`  False Negatives:  ${falseNegatives}`);
console.log(`  True Negatives:   ${trueNegatives}`);
console.log(`  False Positives:  ${falsePositives}`);
console.log(`  Precision:        ${(precision * 100).toFixed(1)}%`);
console.log(`  Recall:           ${(recall * 100).toFixed(1)}%`);
console.log(`  F1 Score:         ${(f1 * 100).toFixed(1)}%`);
console.log("");
