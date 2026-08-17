import type { AssignmentKind, City, Hotzone, QueueStatus, Shift } from "./queue";

export type RecordSource = "operacional" | "entregador";

export type UnifiedItemKind = AssignmentKind | "ENTREGADOR";

export type UnifiedQueueItem = {
  id: string;
  origem: RecordSource;
  tipo: UnifiedItemKind;
  codigo_pessoa: string;
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

export type EntregadorInteresseInput = {
  cpf: string;
  nome: string;
  cidade: City;
  hotzone: Hotzone;
  turno_desejado: Shift;
  data_fila: string;
  contato?: string;
};
