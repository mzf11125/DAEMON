export type SignalProperties = {
  signalId: string;
  summary: string;
  severity?: string;
  status?: string;
  priority?: string;
};

export type CaseSummary = {
  caseId: string;
  title: string;
  status: string;
  ownerId?: string;
  priority?: string;
};
