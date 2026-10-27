import type { OpportunityStage } from "@prisma/client";
import type { Stage } from "./data";

export const STAGE_LABELS: Record<OpportunityStage, Stage> = {
  LEAD: "Lead",
  SEM_INTERESSE: "Sem interesse",
  REUNIAO_AGENDADA: "Reunião agendada",
  REUNIAO_REALIZADA: "Reunião realizada",
  BOLO: "Bolo",
  NOVO_CONTATO: "Lead",
  EM_ATENDIMENTO: "Tentativa de contato",
  PROPOSTA_ENVIADA: "Tentativa de contato",
  EM_NEGOCIACAO: "Tentativa de contato",
  AGUARDANDO_CLIENTE: "Tentativa de contato",
  FOLLOW_UP: "Tentativa de contato",
  EM_TRATATIVA: "Em tratativa",
  FECHADO: "Fechado com sucesso",
  PERDIDO: "Fechado sem sucesso",
};

export const STAGE_VALUES: Record<Stage, OpportunityStage> = {
  "Lead": "LEAD", "Tentativa de contato": "FOLLOW_UP", "Em tratativa": "EM_TRATATIVA", "Sem interesse": "SEM_INTERESSE",
  "Reunião agendada": "REUNIAO_AGENDADA", "Reunião realizada": "REUNIAO_REALIZADA",
  "Bolo": "BOLO", "Fechado sem sucesso": "PERDIDO", "Fechado com sucesso": "FECHADO",
};

export const OPEN_STAGES: OpportunityStage[] = [
  "LEAD", "SEM_INTERESSE", "REUNIAO_AGENDADA", "REUNIAO_REALIZADA", "BOLO",
  "NOVO_CONTATO",
  "EM_ATENDIMENTO",
  "PROPOSTA_ENVIADA",
  "EM_NEGOCIACAO",
  "AGUARDANDO_CLIENTE",
  "FOLLOW_UP",
  "EM_TRATATIVA",
];

export const KANBAN_STAGES: OpportunityStage[] = ["LEAD", "FOLLOW_UP", "EM_TRATATIVA", "SEM_INTERESSE", "REUNIAO_AGENDADA", "REUNIAO_REALIZADA", "BOLO", "PERDIDO", "FECHADO"];

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
