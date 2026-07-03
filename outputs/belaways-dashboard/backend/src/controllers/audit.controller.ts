import { seedAuditLogs } from '../constants/seed-data.js';
import { hasSupabaseConfig } from '../database/supabase.js';
import { sendCsv, sendSuccess } from '../api/response.js';
import { asyncHandler } from '../lib/async-handler.js';
import { auditService } from '../services/supabase/audit.service.js';
import { toCsv } from '../utils/csv.js';

export const auditController = {
  index: asyncHandler(async (request, response) => {
    const format = request.query.format === 'csv' ? 'csv' : 'json';
    const logs = hasSupabaseConfig ? await auditService.list() : seedAuditLogs;

    if (format === 'csv') {
      sendCsv(response, 'auditoria-belaways.csv', toCsv(logs as unknown as Array<Record<string, unknown>>));
      return;
    }

    sendSuccess(response, logs);
  }),
};
