// Form validation — checks email format and password length before sending to Supabase.
export interface ValidationResult {
  email: string;
  password: string;
}

export interface EmailValidationResult {
  email: string;
}

export interface PasswordValidationResult {
  password: string;
}

export interface ValidationError {
  message: string;
}

function validateEmailValue(
  rawEmail: FormDataEntryValue | null,
): EmailValidationResult | ValidationError {
  if (!rawEmail || typeof rawEmail !== "string") {
    return {
      message: "Email is required.",
    };
  }

  const email = rawEmail.trim();
  if (email.length === 0) {
    return {
      message: "Email is required.",
    };
  }
  if (!email.includes("@")) {
    return {
      message: "Please enter a valid email address.",
    };
  }

  return {
    email,
  };
}

function validatePasswordValue(
  rawPassword: FormDataEntryValue | null,
): PasswordValidationResult | ValidationError {
  if (!rawPassword || typeof rawPassword !== "string") {
    return {
      message: "Password is required.",
    };
  }

  const password = rawPassword;
  if (password.length < 6) {
    return {
      message: "Password must be at least 6 characters.",
    };
  }

  return {
    password,
  };
}

export function validateAuthForm(formData: FormData): ValidationResult | ValidationError {
  const emailResult = validateEmailValue(formData.get("email"));
  if (isValidationError(emailResult)) {
    return emailResult;
  }

  const passwordResult = validatePasswordValue(formData.get("password"));
  if (isValidationError(passwordResult)) {
    return passwordResult;
  }

  return {
    email: emailResult.email,
    password: passwordResult.password,
  };
}

export function isValidationError(
  result: ValidationResult | ValidationError | EmailValidationResult | PasswordValidationResult,
): result is ValidationError {
  return "message" in result;
}

export function validateSignupForm(formData: FormData): ValidationResult | ValidationError {
  const base = validateAuthForm(formData);
  if (isValidationError(base)) return base;

  const rawConfirm = formData.get("confirm-password");
  if (!rawConfirm || typeof rawConfirm !== "string") {
    return {
      message: "Please confirm your password.",
    };
  }
  if (rawConfirm !== base.password) {
    return {
      message: "Passwords do not match.",
    };
  }

  return base;
}

export function validateEmailForm(formData: FormData): EmailValidationResult | ValidationError {
  return validateEmailValue(formData.get("email"));
}

export function validateResetPasswordForm(
  formData: FormData,
): PasswordValidationResult | ValidationError {
  const password = validatePasswordValue(formData.get("password"));
  if (isValidationError(password)) {
    return password;
  }

  const rawConfirm = formData.get("confirm-password");
  if (!rawConfirm || typeof rawConfirm !== "string") {
    return {
      message: "Please confirm your password.",
    };
  }
  if (rawConfirm !== password.password) {
    return {
      message: "Passwords do not match.",
    };
  }

  return password;
}
