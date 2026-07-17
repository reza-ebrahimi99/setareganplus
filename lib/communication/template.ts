const TEMPLATE_TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]{0,49})\s*\}\}/g;

export function parseSmsTemplateVariables(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const variables: string[] = [];
  for (const item of value) {
    if (
      typeof item !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(item) ||
      variables.includes(item)
    ) {
      continue;
    }
    variables.push(item);
    if (variables.length === 10) break;
  }
  return variables;
}

export function renderSmsTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(TEMPLATE_TOKEN, (_match, key: string) => variables[key] ?? "");
}
