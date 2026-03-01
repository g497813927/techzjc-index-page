export function yamlQ(v: string): string {
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

export function indentBlock(text: string, spaces = 2): string {
  return String(text).split("\n").map(l => " ".repeat(spaces) + l).join("\n");
}
