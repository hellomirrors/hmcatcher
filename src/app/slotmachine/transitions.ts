import type {
  DialogCondition,
  DialogTransition,
} from "@/domain/dialog/dialog-schema";

export function evaluateCondition(
  condition: DialogCondition,
  variables: Record<string, string>
): boolean {
  const fieldValue = variables[condition.field];
  const { operator, value } = condition;
  switch (operator) {
    case "eq":
      return fieldValue === String(value);
    case "neq":
      return fieldValue !== String(value);
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    case "contains":
      return String(fieldValue ?? "")
        .toLowerCase()
        .includes(String(value).toLowerCase());
    case "gt":
      return Number(fieldValue) > Number(value);
    case "lt":
      return Number(fieldValue) < Number(value);
    default:
      return false;
  }
}

export function evaluateTransitions(
  transitions: DialogTransition[],
  variables: Record<string, string>
): string | undefined {
  for (const transition of transitions) {
    if (!transition.conditions || transition.conditions.length === 0) {
      return transition.targetStepId;
    }
    const allMatch = transition.conditions.every((condition) =>
      evaluateCondition(condition, variables)
    );
    if (allMatch) {
      return transition.targetStepId;
    }
  }
  return undefined;
}
