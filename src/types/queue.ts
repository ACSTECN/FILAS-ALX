export type City = "Rio de Janeiro" | "São Paulo";

export type Shift = "Manhã" | "Tarde" | "Noite" | "Madrugada" | "Flexível";

export type Hotzone =
  | "Bangu"
  | "Santa Cruz"
  | "Tijuca"
  | "Nilópolis"
  | "Zona Sul"
  | "Mooca"
  | "Paulista"
  | "Santo Amaro";

export type QueueRecord = {
  id: string;
  codigo_pessoa: string;
  nome: string;
  cidade: City;
  hotzone: Hotzone;
  turno_desejado: Shift;
  data_fila: string;
  criado_em: string;
};

export type QueueFormValues = {
  codigo_pessoa: string;
  nome: string;
  cidade: City;
  hotzone: Hotzone;
  turno_desejado: Shift;
  data_fila: string;
};

export type QueueFilters = {
  cidade: City | "Todas";
  hotzone: Hotzone | "Todas";
  turno_desejado: Shift | "Todos";
  data_fila: string | "Todas";
};
