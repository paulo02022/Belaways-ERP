import { requireSupabaseAdmin } from '../../database/supabase.js';
import { logger } from '../../lib/logger.js';
import type { AuditLog } from '../../types/domain.js';

type AuditInput = Omit<AuditLog, 'id' | 'createdAt'>;

export class AuditService {
  async list(): Promise<AuditLog[]> {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      ipAddress: row.ip_address,
      action: row.action,
      description: row.description,
      productId: row.product_id,
      orderId: row.order_id,
      result: row.result,
      createdAt: row.created_at,
    }));
  }

  async record(input: AuditInput) {
    try {
      const supabase = requireSupabaseAdmin();
      await supabase.from('audit_logs').insert({
        user_id: input.userId,
        user_email: input.userEmail,
        ip_address: input.ipAddress,
        action: input.action,
        description: input.description,
        product_id: input.productId,
        order_id: input.orderId,
        result: input.result,
      });
    } catch (error) {
      logger.warn({ error }, 'Unable to persist audit log');
    }
  }
}

export const auditService = new AuditService();
