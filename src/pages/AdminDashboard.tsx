import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  LogOut,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { usePlatformAuthStore } from "@/store/platformAuthStore";
import { useAdminStore } from "@/store/adminStore";
import type { Company, CompanyUpsertValues, CompanyUser, CompanyUserUpsertValues } from "@/types/company";
import { CompanyCard } from "@/components/Admin/CompanyCard";
import { CompanyForm } from "@/components/Admin/CompanyForm";
import { CompanyUserList } from "@/components/Admin/CompanyUserList";
import { CompanyUserForm } from "@/components/Admin/CompanyUserForm";

const ALX_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

type AdminView = "overview" | "companies" | "newCompany" | "editCompany" | "users";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = usePlatformAuthStore((s) => s.user);
  const logout = usePlatformAuthStore((s) => s.logout);

  const companies = useAdminStore((s) => s.companies);
  const companyUsers = useAdminStore((s) => s.companyUsers);
  const loading = useAdminStore((s) => s.loading);
  const creating = useAdminStore((s) => s.creating);
  const error = useAdminStore((s) => s.error);
  const loadCompanies = useAdminStore((s) => s.loadCompanies);
  const loadCompanyUsers = useAdminStore((s) => s.loadCompanyUsers);
  const createCompany = useAdminStore((s) => s.createCompany);
  const updateCompany = useAdminStore((s) => s.updateCompany);
  const toggleCompanyActive = useAdminStore((s) => s.toggleCompanyActive);
  const createCompanyUser = useAdminStore((s) => s.createCompanyUser);
  const updateCompanyUser = useAdminStore((s) => s.updateCompanyUser);
  const toggleCompanyUserActive = useAdminStore((s) => s.toggleCompanyUserActive);

  const [view, setView] = useState<AdminView>("overview");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (selectedCompany) {
      void loadCompanyUsers(selectedCompany.id);
    }
  }, [selectedCompany, loadCompanyUsers]);

  const activeCompanies = companies.filter((c) => c.is_active).length;
  const totalUsers = useMemo(
    () =>
      Object.values(companyUsers).reduce(
        (acc, list) => acc + list.filter((u) => u.is_active).length,
        0,
      ),
    [companyUsers],
  );

  const usersForSelected = selectedCompany ? companyUsers[selectedCompany.id] ?? [] : [];
  const isALXSelected = selectedCompany?.id === ALX_COMPANY_ID;

  if (!user || user.role !== "platform_admin") {
    return <Navigate to="/admin-login" replace />;
  }

  const handleNewCompany = async (values: CompanyUpsertValues) => {
    const created = await createCompany(values);
    if (created) setView("companies");
  };

  const handleEditCompany = async (values: CompanyUpsertValues) => {
    if (!selectedCompany) return;
    const ok = await updateCompany(selectedCompany.id, values);
    if (ok) setView("companies");
  };

  const handleNewUser = async (values: CompanyUserUpsertValues) => {
    if (!selectedCompany) return;
    const ok = await createCompanyUser(selectedCompany.id, values);
    if (ok) setEditingUser(null);
  };

  const handleEditUser = async (values: CompanyUserUpsertValues) => {
    if (!editingUser) return;
    const ok = await updateCompanyUser(editingUser.id, values);
    if (ok) setEditingUser(null);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-[420px] rounded-full bg-[#a78bfa]/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-[340px] w-[340px] rounded-full bg-[#2563eb]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-[#f59e0b]/10 blur-3xl" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#2563eb] via-[#a78bfa] to-[#f59e0b] p-2">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#c4b5fd]">
                Admin · Plataforma
              </p>
              <h1 className="text-xl font-semibold text-white">Painel administrativo</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir para ALX
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/admin-login", { replace: true });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Empresas cadastradas</p>
              <Building2 className="h-5 w-5 text-[#a78bfa]" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{companies.length}</p>
            <p className="mt-2 text-sm text-slate-400">{activeCompanies} ativas</p>
          </div>
          <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Usuarios ativos</p>
              <Users className="h-5 w-5 text-[#38bdf8]" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">
              {totalUsers + 8 /* analistas ALX hardcoded */}
            </p>
            <p className="mt-2 text-sm text-slate-400">inclui equipe ALX hardcoded</p>
          </div>
          <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Sessao admin</p>
              <ShieldAlert className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <p className="mt-5 truncate text-2xl font-semibold text-white">
              {user?.displayName ?? user?.identifier}
            </p>
            <p className="mt-2 text-sm text-slate-400">Acesso central do dono da plataforma</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCompany(null);
              setView("overview");
            }}
            className={`rounded-[18px] px-4 py-2 text-sm transition ${
              view === "overview"
                ? "bg-white/10 font-semibold text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Visao geral
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCompany(null);
              setView("companies");
            }}
            className={`rounded-[18px] px-4 py-2 text-sm transition ${
              view === "companies"
                ? "bg-white/10 font-semibold text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Empresas
          </button>
          {view !== "newCompany" ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCompany(null);
                setView("newCompany");
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-[#a78bfa] to-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {view === "newCompany" ? (
          <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Cadastro
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Nova empresa cliente
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setView("companies")}
                className="text-sm text-slate-300 hover:text-white"
              >
                ← Voltar para lista
              </button>
            </div>
            <CompanyForm
              submitting={creating}
              onSubmit={handleNewCompany}
              onCancel={() => setView("companies")}
            />
          </div>
        ) : null}

        {view === "editCompany" && selectedCompany ? (
          <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Editar empresa
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedCompany.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setView("companies")}
                className="text-sm text-slate-300 hover:text-white"
              >
                ← Voltar
              </button>
            </div>
            <CompanyForm
              initial={selectedCompany}
              submitting={creating}
              onSubmit={handleEditCompany}
              onCancel={() => setView("companies")}
            />
          </div>
        ) : null}

        {view === "overview" || view === "companies" ? (
          <div>
            {view === "overview" ? (
              <div className="alx-card mb-6 rounded-[32px] border border-white/10 p-6 backdrop-blur">
                <h2 className="text-2xl font-semibold text-white">Bem-vindo ao painel central</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Use a aba Empresas para adicionar clientes, definir seu plano, pracas e
                  funcionalidades liberadas. Depois, compartilhe os links automaticos.
                  O isolamento por empresa garante que nenhum dado se mistura.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    isolamento company_id
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    ALX intacta (hardcoded)
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    links /c/{'{slug}'}
                  </span>
                </div>
              </div>
            ) : null}

            {loading && companies.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 text-slate-300">
                Carregando empresas...
              </div>
            ) : companies.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <p className="text-lg font-medium text-white">Nenhuma empresa cadastrada</p>
                <p className="mt-2 text-sm text-slate-400">
                  Clique em "Nova empresa" para cadastrar a primeira (ex: Fox).
                </p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    users={companyUsers[company.id]}
                    isALXLegacy={company.id === ALX_COMPANY_ID}
                    onEdit={(c) => {
                      setSelectedCompany(c);
                      setView("editCompany");
                    }}
                    onToggleActive={async (id) => {
                      await toggleCompanyActive(id);
                      void loadCompanies();
                    }}
                    onManageUsers={(c) => {
                      setSelectedCompany(c);
                      setView("users");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {view === "users" && selectedCompany ? (
          <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => setView("companies")}
                  className="text-xs uppercase tracking-[0.22em] text-slate-400 hover:text-white"
                >
                  ← Voltar para empresas
                </button>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Usuarios · {selectedCompany.name}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {usersForSelected.length} / {selectedCompany.max_users} usuarios alocados
                </p>
              </div>
              {!isALXSelected ? (
                <button
                  type="button"
                  onClick={() => setEditingUser({} as CompanyUser)}
                  className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-[#38bdf8] to-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
                >
                  <Plus className="h-4 w-4" />
                  Novo usuario
                </button>
              ) : (
                <span className="rounded-full border border-[#fbbf24]/30 bg-[#fbbf24]/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#fde68a]">
                  ALX usa usuarios hardcoded · 8 analistas
                </span>
              )}
            </div>

            {editingUser && !isALXSelected ? (
              <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-white">
                  {editingUser.id ? "Editar usuario" : "Novo usuario"}
                </p>
                <CompanyUserForm
                  initial={editingUser.id ? editingUser : null}
                  submitting={creating}
                  requirePassword={!editingUser.id}
                  onSubmit={editingUser.id ? handleEditUser : handleNewUser}
                  onCancel={() => setEditingUser(null)}
                />
              </div>
            ) : null}

            <CompanyUserList
              users={usersForSelected}
              loading={loading && usersForSelected.length === 0}
              onEdit={(u) => setEditingUser(u)}
              onToggleActive={async (id) => {
                await toggleCompanyUserActive(id);
                if (selectedCompany) void loadCompanyUsers(selectedCompany.id);
              }}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
