import type { OpportunityStage } from "@prisma/client";

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  NOVO_CONTATO: "Novo contato",
  EM_ATENDIMENTO: "Em atendimento",
  PROPOSTA_ENVIADA: "Proposta enviada",
  EM_NEGOCIACAO: "Em negociação",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  FOLLOW_UP: "Follow-up",
  FECHADO: "Fechado",
  PERDIDO: "Perdido",
};

export const OPEN_STAGES: OpportunityStage[] = [
  "NOVO_CONTATO",
  "EM_ATENDIMENTO",
  "PROPOSTA_ENVIADA",
  "EM_NEGOCIACAO",
  "AGUARDANDO_CLIENTE",
  "FOLLOW_UP",
];

export const KANBAN_STAGES: OpportunityStage[] = [...OPEN_STAGES, "FECHADO", "PERDIDO"];

export const DELIVERABLE_LABELS: Record<string, string> = {
  AGUARDANDO_EDITOR: "Aguardando editor",
  EM_PRODUCAO: "Em produção",
  ENVIADO_REVISAO: "Enviado para revisão",
  EM_REVISAO: "Em revisão Garro",
  CORRECAO: "Correção",
  APROVADO: "Aprovado",
  ENTREGUE: "Entregue",
  CONCLUIDO: "Concluído",
};

export const DEMAND_LABELS: Record<string, string> = {
  NOVA: "Nova",
  PLANEJAMENTO: "Planejamento",
  AGUARDANDO_EDITOR: "Aguardando editor",
  EM_PRODUCAO: "Em produção",
  ENVIADO_REVISAO: "Enviado para revisão",
  EM_REVISAO: "Em revisão Garro",
  CORRECAO: "Correção",
  PRONTO_ENTREGA: "Pronto para entrega",
  ENTREGUE: "Entregue",
  CONCLUIDO: "Concluído",
};

export const RISK_LABELS = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
  CRITICO: "Crítico",
} as const;
