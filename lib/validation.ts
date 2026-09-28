import { z } from "zod";
import { authContent } from "@/lib/auth/content";

interface ValidationResult {
  email: string;
  password: string;
}

interface EmailValidationResult {
  email: string;
}

interface PasswordValidationResult {
  password: string;
}

interface ValidationError {
  message: string;
}

function validateEmailValue(
  rawEmail: FormDataEntryValue | null,
): EmailValidationResult | ValidationError {
  if (!rawEmail || typeof rawEmail !== "string") {
    return {
      message: authContent.emailRequired,
    };
  }

  const email = rawEmail.trim();
  if (email.length === 0) {
    return {
      message: authContent.emailRequired,
    };
  }
  if (!z.email().safeParse(email).success) {
    return {
      message: authContent.emailInvalid,
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
      message: authContent.passwordRequired,
    };
  }

  const password = rawPassword;
  if (password.length < 6) {
    return {
      message: authContent.passwordLength,
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
      message: authContent.passwordConfirmRequired,
    };
  }
  if (rawConfirm !== base.password) {
    return {
      message: authContent.passwordMismatch,
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
      message: authContent.passwordConfirmRequired,
    };
  }
  if (rawConfirm !== password.password) {
    return {
      message: authContent.passwordMismatch,
    };
  }

  return password;
}

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  const unsafe = (text: string) =>
    Array.from(text).some(
      (character) =>
        character === "\\" || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    );
  if (unsafe(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || unsafe(decoded)) return null;
    const url = new URL(value, "https://oparax.invalid");
    if (url.origin !== "https://oparax.invalid" || url.pathname.startsWith("//")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
