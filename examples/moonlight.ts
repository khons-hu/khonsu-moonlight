// Khonsu Moonlight: a small theme preview
type Check = { name: string; passed: boolean };

const checks: Check[] = [
  { name: "Readable syntax", passed: true },
  { name: "Clear diffs", passed: true },
];

export function summarize(items: Check[]): string {
  const passed = items.filter((item) => item.passed).length;
  return `${passed}/${items.length} checks passed`;
}

console.log(summarize(checks));
