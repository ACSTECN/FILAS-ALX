import { create } from "zustand";
import type { AuthUser, UserRole } from "@/types/auth";
import {
  isValidOperacionalPassword,
  isValidCPF,
  normalizeCPF,
} from "@/types/auth";

const AUTH_STORAGE_KEY = "alx-auth-session";

function readSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && (parsed.role === "operacional" || parsed.role === "entregador")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

type AuthStore = {
  user: AuthUser | null;
  loginError: string | null;
  loginOperacional: (password: string) => boolean;
  loginEntregador: (cpf: string) => boolean;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: readSession(),
  loginError: null,
  loginOperacional: (password) => {
    if (!isValidOperacionalPassword(password)) {
      set({ loginError: "Senha operacional invalida." });
      return false;
    }
    const user: AuthUser = { role: "operacional", identifier: "operacional" };
    writeSession(user);
    set({ user, loginError: null });
    return true;
  },
  loginEntregador: (cpf) => {
    const digits = normalizeCPF(cpf);
    if (!isValidCPF(digits)) {
      set({ loginError: "Informe um CPF valido para entrar." });
      return false;
    }
    const user: AuthUser = { role: "entregador", identifier: digits };
    writeSession(user);
    set({ user, loginError: null });
    return true;
  },
  logout: () => {
    writeSession(null);
    set({ user: null, loginError: null });
  },
}));

export function roleMatches(
  user: AuthUser | null,
  allowed: UserRole | UserRole[],
): boolean {
  if (!user) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(user.role);
}
