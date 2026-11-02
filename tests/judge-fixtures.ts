export const cases = [
  { type: "number", value: -42 },
  { type: "boolean", value: false },
  { type: "number[]", value: [3, -2, 0, 17] },
  { type: "string", value: 'Hello "duel"\\world\n\r\t☃' },
  { type: "string[]", value: ['a"b', "c\\d", "line\nbreak", "tab\treturn\r", "☃"] },
];

const types: Record<string, Record<string, string>> = {
  cpp: { number: "int", boolean: "bool", "number[]": "vector<int>", string: "string", "string[]": "vector<string>" },
  java: { number: "int", boolean: "boolean", "number[]": "int[]", string: "String", "string[]": "String[]" },
  go: { number: "int", boolean: "bool", "number[]": "[]int", string: "string", "string[]": "[]string" },
  rust: { number: "i64", boolean: "bool", "number[]": "Vec<i64>", string: "String", "string[]": "Vec<String>" },
};

export function solution(language: string, type: string) {
  if (language === "javascript") return "function echo(value) { return value; }";
  if (language === "python") return "def echo(value):\n    return value";
  const t = types[language][type];
  if (language === "cpp") return `${t} echo(${t} value) { return value; }`;
  if (language === "java") return `public static ${t} echo(${t} value) { return value; }`;
  if (language === "go") return `package main\nfunc echo(value ${t}) ${t} { return value }`;
  return `fn echo(value: ${t}) -> ${t} { value }`;
}
