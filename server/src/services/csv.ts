import Papa from 'papaparse';

export interface ParsedContactRow {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  customFields: Record<string, any>;
  isValidEmail: boolean;
  isDuplicate: boolean;
  rowNumber: number;
}

export interface ParseResult {
  headers: string[];
  suggestedMapping: Record<string, string>; // stdField -> csvHeader
  contacts: ParsedContactRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function parseCSVContent(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields || [];
  const suggestedMapping = detectColumnMapping(headers);

  const seenEmails = new Set<string>();
  const contacts: ParsedContactRow[] = [];

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  parsed.data.forEach((row, idx) => {
    const rowNumber = idx + 2; // Header is line 1

    // Find email value based on suggested mapping or raw search
    const emailHeader = suggestedMapping['email'] || headers.find(h => /email|e-mail|mail/i.test(h));
    const nameHeader = suggestedMapping['name'] || headers.find(h => /name|full_name|first_name/i.test(h));
    const companyHeader = suggestedMapping['company'] || headers.find(h => /company|org|organization/i.test(h));
    const roleHeader = suggestedMapping['role'] || headers.find(h => /role|title|job/i.test(h));

    const rawEmail = (emailHeader && row[emailHeader] ? row[emailHeader] : Object.values(row).find(val => EMAIL_REGEX.test(val?.trim() || '')) || '').trim();
    const name = nameHeader && row[nameHeader] ? row[nameHeader].trim() : undefined;
    const company = companyHeader && row[companyHeader] ? row[companyHeader].trim() : undefined;
    const role = roleHeader && row[roleHeader] ? row[roleHeader].trim() : undefined;

    const customFields: Record<string, any> = {};
    headers.forEach(h => {
      if (h !== emailHeader && h !== nameHeader && h !== companyHeader && h !== roleHeader) {
        customFields[h] = row[h];
      }
    });

    const isValidEmail = EMAIL_REGEX.test(rawEmail);
    const normalizedEmail = rawEmail.toLowerCase();
    const isDuplicate = seenEmails.has(normalizedEmail);

    if (isValidEmail && !isDuplicate) {
      seenEmails.add(normalizedEmail);
      validCount++;
    } else if (!isValidEmail) {
      invalidCount++;
    } else if (isDuplicate) {
      duplicateCount++;
    }

    contacts.push({
      email: rawEmail,
      name,
      company,
      role,
      customFields,
      isValidEmail,
      isDuplicate,
      rowNumber,
    });
  });

  return {
    headers,
    suggestedMapping,
    contacts,
    totalRows: contacts.length,
    validCount,
    invalidCount,
    duplicateCount,
  };
}

export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!mapping['email'] && ['email', 'emailaddress', 'contactemail', 'mail', 'e-mail'].includes(clean)) {
      mapping['email'] = header;
    } else if (!mapping['name'] && ['name', 'fullname', 'firstname', 'contactname', 'recipient'].includes(clean)) {
      mapping['name'] = header;
    } else if (!mapping['company'] && ['company', 'companyname', 'organization', 'org', 'business'].includes(clean)) {
      mapping['company'] = header;
    } else if (!mapping['role'] && ['role', 'jobtitle', 'title', 'position'].includes(clean)) {
      mapping['role'] = header;
    }
  });

  return mapping;
}

export function extractGoogleSheetId(urlOrId: string): string | null {
  if (/^[a-zA-Z0-9-_]{25,50}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function getGoogleSheetCsvUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}
