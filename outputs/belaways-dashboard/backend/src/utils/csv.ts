const escapeCsv = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).replaceAll('"', '""');
  return `"${normalized}"`;
};

export const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ];

  return lines.join('\n');
};
