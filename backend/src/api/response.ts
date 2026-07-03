import type { Response } from 'express';

export type ApiMeta = Record<string, unknown>;

export const sendSuccess = <T>(
  response: Response,
  data: T,
  message = 'ok',
  meta?: ApiMeta,
  statusCode = 200,
) => {
  response.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const sendCsv = (response: Response, filename: string, csv: string) => {
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.status(200).send(csv);
};
