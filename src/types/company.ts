import type { Hotzone } from "@/types/queue";

export type CompanyFeatureKey =
  | "enable_fila"
  | "enable_ranking"
  | "enable_historico"
  | "enable_entregador_portal";

export type Company = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  max_users: number;
  enable_fila: boolean;
  enable_ranking: boolean;
  enable_historico: boolean;
  enable_entregador_portal: boolean;
  allowed_hotzones: Hotzone[];
  created_at: string;
};

export type CompanyUser = {
  id: string;
  company_id: string;
  name: string;
  initials: string;
  is_active: boolean;
  created_at: string;
};

export type CompanyUpsertValues = {
  slug: string;
  name: string;
  logo_url?: string | null;
  is_active?: boolean;
  max_users?: number;
  enable_fila?: boolean;
  enable_ranking?: boolean;
  enable_historico?: boolean;
  enable_entregador_portal?: boolean;
  allowed_hotzones?: Hotzone[];
};

export type CompanyUserUpsertValues = {
  name: string;
  initials: string;
  password?: string;
  is_active?: boolean;
};
