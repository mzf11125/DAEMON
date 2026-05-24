// Daemon ops core actions — propose→HITL path (P3 task-asset)
const DAEMON_OPS_ALLOWLIST: readonly string[] = [
  'OpenCase',
  'CreateWorkOrder',
  'ExecuteWorkOrder',
  'RecordDecision',
  'EscalateSignal',
  'CreateShipmentDraft',
  'ConfirmShipment',
] as const;

// Default Wave 1 allowlist — ops domain core actions
// Diperluas setelah Object Catalog v0.2 selesai
const DEFAULT_WAVE1_ALLOWLIST: readonly string[] = [
  // Shipment
  'transitionShipmentState',
  'assignShipmentException',
  // Exception
  'assignExceptionOwner',
  'resolveException',
  'escalateException',
  // Interco (Wave 2 — listed for readiness)
  // 'markIntercoEliminated',
  // 'postIntercoAdjustment',
  ...DAEMON_OPS_ALLOWLIST,
] as const;

export function getDefaultAllowlist(): string[] {
  return [...DEFAULT_WAVE1_ALLOWLIST];
}

export function isActionAllowed(actionTypeId: string, allowlist: string[]): boolean {
  return allowlist.includes(actionTypeId);
}
