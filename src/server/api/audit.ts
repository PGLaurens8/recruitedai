interface AuditWriter {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => unknown;
  };
}

export interface AuditLogInput {
  companyId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(writer: AuditWriter, input: AuditLogInput) {
  const { error } = (await writer.from('audit_logs').insert({
    company_id: input.companyId,
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId || null,
    metadata: input.metadata || {},
  })) as { error: unknown | null };

  if (error) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        event: 'audit_log_insert_failed',
        action: input.action,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        targetType: input.targetType,
        targetId: input.targetId || null,
        details: error,
      })
    );
  }
}
