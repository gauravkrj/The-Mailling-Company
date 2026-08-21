import { describe, it, expect } from 'vitest';
import { parseCSVContent, detectColumnMapping, extractGoogleSheetId } from '../services/csv.js';

describe('CSV Parser & Google Sheets Service', () => {
  it('correctly parses CSV content and identifies headers', () => {
    const rawCsv = `Full Name,Email Address,Company,Job Title,Custom Notes
Alex Smith,alex@company.com,Acme Corp,CTO,Lead candidate
Jane Doe,jane.doe@tech.io,TechIO,VP Engineering,Met at conference
Invalid User,invalid-email-format,NoCorp,Manager,Test row
Alex Smith,alex@company.com,Acme Corp,CTO,Duplicate candidate`;

    const result = parseCSVContent(rawCsv);

    expect(result.totalRows).toBe(4);
    expect(result.headers).toEqual(['Full Name', 'Email Address', 'Company', 'Job Title', 'Custom Notes']);
    expect(result.validCount).toBe(2); // 2 unique valid emails
    expect(result.invalidCount).toBe(1); // invalid-email-format
    expect(result.duplicateCount).toBe(1); // alex@company.com duplicated
  });

  it('auto-suggests column mappings accurately', () => {
    const headers = ['Contact Name', 'E-Mail', 'Organization', 'Job Position', 'Location'];
    const mapping = detectColumnMapping(headers);

    expect(mapping.email).toBe('E-Mail');
    expect(mapping.name).toBe('Contact Name');
    expect(mapping.company).toBe('Organization');
  });

  it('extracts Google Sheet ID from sharing URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    const id = extractGoogleSheetId(url);
    expect(id).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  });
});
