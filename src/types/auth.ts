export type UserRole = "operacional" | "entregador";

export type AuthUser = {
  role: UserRole;
  identifier: string;
};

export const OPERACIONAL_PASSWORD_KEY = "alx-operacional-senha";
export const OPERACIONAL_DEFAULT_PASSWORD = "alx2026operacao";

export function isValidOperacionalPassword(value: string) {
  if (typeof window !== "undefined") {
    const env = (import.meta.env.VITE_OPERACIONAL_PASSWORD as string | undefined)?.trim();
    if (env) {
      return value.trim() === env;
    }
  }
  return value.trim() === OPERACIONAL_DEFAULT_PASSWORD;
}

export function normalizeCPF(value: string) {
  return value.replace(/\D+/g, "").slice(0, 11);
}

export function isValidCPF(value: string) {
  const digits = normalizeCPF(value);
  if (digits.length !== 11) {
    return false;
  }
  return /^(\d)\1{10}$/.test(digits) ? false : true;
}

export function formatCPF(value: string) {
  const digits = normalizeCPF(value);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
