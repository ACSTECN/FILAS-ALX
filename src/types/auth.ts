export type UserRole = "operacional" | "entregador";

export type AnalystUser = {
  id: string;
  role: "operacional";
  name: string;
  initials: string;
  password: string;
};

export type AuthUser = {
  role: UserRole;
  identifier: string;
  analystId?: string;
  analystName?: string;
  analystInitials?: string;
};

export const ANALYST_USERS: AnalystUser[] = [
  {
    id: "gustavo",
    role: "operacional",
    name: "Gustavo",
    initials: "G",
    password: "gustavo@alx",
  },
  {
    id: "guilherme",
    role: "operacional",
    name: "Guilherme",
    initials: "G",
    password: "guilherme@alx",
  },
  {
    id: "larissa",
    role: "operacional",
    name: "Larissa",
    initials: "L",
    password: "larissa@alx",
  },
  {
    id: "carol",
    role: "operacional",
    name: "Carol",
    initials: "C",
    password: "carol@alx",
  },
  {
    id: "yuri",
    role: "operacional",
    name: "Yuri",
    initials: "Y",
    password: "yuri@alx",
  },
  {
    id: "luis",
    role: "operacional",
    name: "Luis",
    initials: "L",
    password: "luis@alx",
  },
  {
    id: "alessandro",
    role: "operacional",
    name: "Alessandro",
    initials: "A",
    password: "alessandro@alx",
  },
  {
    id: "marcelo",
    role: "operacional",
    name: "Marcelo",
    initials: "M",
    password: "marcelo@alx",
  },
];

export function findAnalystByCredentials(nameInput: string, passwordInput: string) {
  const cleanName = nameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();
  return (
    ANALYST_USERS.find(
      (item) =>
        item.name.toLowerCase() === cleanName && item.password === cleanPassword,
    ) ?? null
  );
}

export function findAnalystById(id: string) {
  return ANALYST_USERS.find((item) => item.id === id) ?? null;
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
