/** 手机号脱敏：138****8293 */
export function maskPhone(phone?: null | string) {
  if (!phone) {
    return '';
  }
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/** 邮箱脱敏：ant***@example.com */
export function maskEmail(email?: null | string) {
  if (!email) {
    return '';
  }
  const at = email.indexOf('@');
  if (at <= 0) {
    return email;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal =
    local.length <= 2 ? `${local[0] ?? ''}***` : `${local.slice(0, 3)}***`;
  return `${maskedLocal}@${domain}`;
}

export function displayValue(value?: null | string, emptyText = '—') {
  const text = value?.trim();
  return text || emptyText;
}

export function resolveAvatarUrl(avatar?: null | string, fallback = '') {
  const value = avatar?.trim();
  if (!value) {
    return fallback;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

export function formatRoleLabels(
  roleNames?: null | string[],
  roleCodes?: null | string[],
) {
  if (roleNames?.length) {
    return roleNames.join('、');
  }
  if (roleCodes?.length) {
    return roleCodes.join('、');
  }
  return '';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^1\d{10}$/;

export function isValidEmail(email: string) {
  return !email || EMAIL_PATTERN.test(email);
}

export function isValidPhone(phone: string) {
  return !phone || PHONE_PATTERN.test(phone);
}

export const PASSWORD_STRENGTH_COLORS = [
  '',
  '#e74242',
  '#ED6F6F',
  '#EFBD47',
  '#55D18780',
  '#55D187',
] as const;

export type PasswordSecurityLevel = 'MEDIUM' | 'STRONG' | 'UNKNOWN' | 'WEAK';

export function getPasswordStrengthColor(score = 0) {
  return PASSWORD_STRENGTH_COLORS[Math.max(0, Math.min(5, score))] ?? '';
}

export function isPasswordExpired(updatedAt?: string, days = 90) {
  if (!updatedAt) {
    return false;
  }
  const updatedTime = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedTime)) {
    return false;
  }
  return Date.now() - updatedTime > days * 24 * 60 * 60 * 1000;
}

export interface ProfileEditForm {
  email: string;
  phone: string;
  realName: string;
}

export function isProfileEditDirty(
  form: ProfileEditForm,
  snapshot: ProfileEditForm,
) {
  return (
    form.realName.trim() !== snapshot.realName.trim() ||
    form.phone.trim() !== snapshot.phone.trim() ||
    form.email.trim() !== snapshot.email.trim()
  );
}
