export interface TextFieldRule {
  label: string;
  value: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  trim?: boolean;
}

export function validateTextFields(
  fields: Record<string, TextFieldRule>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(fields)) {
    const value = rule.trim === false ? rule.value : rule.value.trim();
    if (rule.required && !value) {
      errors[field] = `${rule.label} is required.`;
    } else if (value && rule.minLength && value.length < rule.minLength) {
      errors[field] =
        `${rule.label} must be at least ${rule.minLength} characters.`;
    } else if (value && rule.maxLength && value.length > rule.maxLength) {
      errors[field] =
        `${rule.label} must be ${rule.maxLength} characters or fewer.`;
    }
  }

  return errors;
}
