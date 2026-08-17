import type { RecordSource, UnifiedItemKind } from "./unified";

export type City = "Rio de Janeiro" | "São Paulo";

export type Shift = "Manhã" | "Tarde" | "Noite" | "Ceia" | "Flexível";

export type Hotzone =
  | "Bangu"
  | "Santa Cruz"
  | "Tijuca"
  | "Nilópolis"
  | "Zona Sul"
  | "Mooca"
  | "Paulista"
  | "Santo Amaro";

export type AssignmentKind = "FILA" | "TPR";

export type QueueStatus =
  | "na_fila_fila"
  | "na_fila_tpr"
  | "na_fila_entregador"
  | "atribuido_fila"
  | "atribuido_tpr"
  | "atribuido_entregador"
  | "retirado_fila"
  | "retirado_tpr"
  | "retirado_entregador";

export type QueueRecord = {
  id: string;
  origem: RecordSource;
  tipo: UnifiedItemKind;
  codigo_pessoa: string | null;
  cpf: string | null;
  nome: string;
  cidade: City;
  hotzone: Hotzone;
  turno_desejado: Shift;
  data_fila: string;
  status: QueueStatus;
  analista: string | null;
  entregador_contato?: string | null;
  criado_em: string;
};

export type QueueFormValues = {
  origem?: RecordSource;
  tipo?: UnifiedItemKind;
  codigo_pessoa: string | null;
  cpf?: string | null;
  nome: string;
  cidade: City;
  hotzone: Hotzone;
  tipo_atribuicao?: AssignmentKind;
  turno_desejado: Shift;
  data_fila: string;
  status?: QueueStatus;
  analista?: string | null;
  entregador_contato?: string | null;
};

export type QueueFilters = {
  cidade: City | "Todas";
  hotzone: Hotzone | "Todas";
  turno_desejado: Shift | "Todos";
  data_fila: string | "Todas";
  origem: RecordSource | "Todas";
  tipo: UnifiedItemKind | "Todas";
};
