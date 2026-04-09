const TEMPLATE_RE = /\{\{(\w+)\}\}/g;

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(TEMPLATE_RE, (_match, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}
