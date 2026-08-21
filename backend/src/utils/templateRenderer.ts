import { EmailDesign } from '@mailpersonalize/shared';

export interface RenderEmailOptions {
  bodyContent: string;
  design?: Partial<EmailDesign> | null;
  contactData?: Record<string, any>;
}

/**
 * Reusable Email-Client-Safe HTML Template Renderer (Phase 5A Requirement)
 * Generates table-based HTML with inline CSS compatible with Outlook, Gmail, Apple Mail, Yahoo.
 */
export function renderEmailHtml(options: RenderEmailOptions): string {
  const { bodyContent, design, contactData } = options;

  let processedBody = bodyContent || '';

  // 1. Canonical Fixed Tag Replacement & Legacy Alias Substitution (Phase 13D Requirement)
  if (contactData) {
    const emailVal = contactData.email || '';
    const fullNameVal =
      contactData.full_name ||
      contactData.name ||
      contactData['full name'] ||
      contactData['Full Name'] ||
      '';
    const companyVal =
      contactData.company ||
      contactData.company_name ||
      contactData['Company Name'] ||
      '';
    const roleVal =
      contactData.role ||
      contactData.title ||
      contactData.job_title ||
      '';

    const attr1 = contactData.attribute_1 || contactData['attribute_1'] || '';
    const attr2 = contactData.attribute_2 || contactData['attribute_2'] || '';
    const attr3 = contactData.attribute_3 || contactData['attribute_3'] || '';
    const attr4 = contactData.attribute_4 || contactData['attribute_4'] || '';
    const attr5 = contactData.attribute_5 || contactData['attribute_5'] || '';

    // Replace canonical tags and aliases
    processedBody = processedBody
      .replace(/\{\{\s*email\s*\}\}/gi, emailVal)
      .replace(/\{\{\s*(full_name|full\s*name|name|contact_name|fullname|first_name)\s*\}\}/gi, fullNameVal)
      .replace(/\{\{\s*(company|organization|company_name|org|company\s*name)\s*\}\}/gi, companyVal)
      .replace(/\{\{\s*(role|title|job_title|position|job\s*title)\s*\}\}/gi, roleVal)
      .replace(/\{\{\s*attribute_1\s*\}\}/gi, attr1)
      .replace(/\{\{\s*attribute_2\s*\}\}/gi, attr2)
      .replace(/\{\{\s*attribute_3\s*\}\}/gi, attr3)
      .replace(/\{\{\s*attribute_4\s*\}\}/gi, attr4)
      .replace(/\{\{\s*attribute_5\s*\}\}/gi, attr5);

    // Replace any custom_fields key-value overrides
    if (contactData.custom_fields && typeof contactData.custom_fields === 'object') {
      Object.entries(contactData.custom_fields).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          processedBody = processedBody.replace(new RegExp(`\\{\\{\\s*${escapedK}\\s*\\}\\}`, 'gi'), String(v));
        }
      });
    }
  }

  // Strip any unmapped/absent tags remaining in {{...}} to empty string (Phase 13D Requirement: never show undefined/null)
  processedBody = processedBody.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');

  // Strip raw square bracket tags if any remain
  processedBody = processedBody.replace(/\[\s*(your\s*name|name|my\s*name|insert\s*name)\s*\]/gi, '');

  // Design tokens & options
  const logoUrl = design?.logo_url || '';
  const logoSize = design?.logo_size || 'medium';
  const logoAlign = design?.logo_align || 'center';
  const headerColor = design?.header_color || '#1A1617';
  const headerBgImage = design?.header_bg_image || '';
  const headerTitle = design?.header_title || '';
  const headerSubtitle = design?.header_subtitle || '';
  const headerTextColor = design?.header_text_color || '#F2EDEE';
  const accentColor = design?.accent_color || '#7B2038';
  const fontFamily = design?.font_family || 'Arial, Helvetica, sans-serif';
  const signatureHtml = design?.signature_html || '';

  // Button design options
  const ctaText = design?.cta_button_text || '';
  const ctaUrl = design?.cta_button_url || '';
  const ctaBgColor = design?.cta_button_bg_color || accentColor;
  const ctaTextColor = design?.cta_button_text_color || '#ffffff';
  const ctaRadius = design?.cta_button_radius || '6px';
  const ctaAlign = design?.cta_button_align || 'center';

  // Logo size mapping
  let logoWidth = '140px';
  if (logoSize === 'small') logoWidth = '100px';
  if (logoSize === 'large') logoWidth = '200px';

  // Convert double line breaks into paragraphs with crisp dark text for email bodies
  let bodyParagraphs = '';
  if (processedBody.includes('<p>') || processedBody.includes('<div>') || processedBody.includes('<h2>')) {
    bodyParagraphs = processedBody;
  } else {
    bodyParagraphs = processedBody
      .split('\n\n')
      .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #111827; font-size: 14px;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }

  // CTA Button HTML Snippet (Only rendered if ctaText AND ctaUrl are non-empty!)
  let ctaButtonHtml = '';
  if (ctaText.trim() && ctaUrl.trim()) {
    ctaButtonHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="${ctaAlign}">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" bgcolor="${ctaBgColor}" style="border-radius: ${ctaRadius};">
                <a href="${ctaUrl}" target="_blank" style="font-size: 14px; font-family: ${fontFamily}; color: ${ctaTextColor}; text-decoration: none; border-radius: ${ctaRadius}; padding: 12px 28px; display: inline-block; font-weight: bold; background-color: ${ctaBgColor};">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  // Determine if full header banner should render
  const isCustomHeaderColor = headerColor && headerColor.toLowerCase() !== '#1a1617';
  const showHeaderBanner = logoUrl || headerBgImage || headerTitle || headerSubtitle || isCustomHeaderColor;

  let headerStyle = `background-color: ${headerColor}; padding: 28px 24px; border-bottom: 1px solid rgba(255,255,255,0.08);`;
  if (headerBgImage) {
    headerStyle += ` background-image: url('${headerBgImage}'); background-size: cover; background-position: center; min-height: 100px;`;
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: ${fontFamily}; color: #111827;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- 600px Email Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; border-collapse: separate; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header Banner Section -->
          ${
            showHeaderBanner
              ? `<tr>
                  <td align="${logoAlign}" style="${headerStyle}">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" width="${logoWidth}" style="display: inline-block; border: 0; max-width: 100%; height: auto;" /><br/>` : ''}
                    ${headerTitle ? `<h1 style="margin: 8px 0 4px 0; color: ${headerTextColor}; font-size: 20px; font-weight: bold;">${headerTitle}</h1>` : ''}
                    ${headerSubtitle ? `<p style="margin: 0; color: ${headerTextColor}; opacity: 0.8; font-size: 13px;">${headerSubtitle}</p>` : ''}
                  </td>
                </tr>`
              : `<tr>
                  <td style="background-color: ${headerColor}; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>`
          }

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 32px 28px; background-color: #ffffff; color: #111827;">
              ${bodyParagraphs}
              ${ctaButtonHtml}

              <!-- Signature Block -->
              ${
                signatureHtml
                  ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                      <tr>
                        <td style="color: #4b5563; font-size: 13px; line-height: 1.5;">
                          ${signatureHtml}
                        </td>
                      </tr>
                    </table>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">
              Sent via <span style="color: ${accentColor}; font-weight: bold;">The Mailling Company</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface RenderPlainTextOptions {
  bodyContent: string;
  plainSignature?: string | null;
  contactData?: Record<string, any>;
}

/**
 * Clean Plain-Text Email Renderer (Phase 5C Requirement)
 * Substitutes contact variables and appends plain text signature without HTML tags.
 */
export function renderPlainTextEmail(options: RenderPlainTextOptions): string {
  const { bodyContent, plainSignature, contactData } = options;

  let processedBody = bodyContent || '';
  let processedSignature = plainSignature || '';

  if (contactData) {
    const nameVal =
      contactData.name ||
      contactData['full name'] ||
      contactData['Full Name'] ||
      contactData['full_name'] ||
      contactData['contact_name'] ||
      contactData['first_name'] ||
      '';

    if (nameVal) {
      processedBody = processedBody.replace(/\{\{\s*(full\s*name|name|contact_name|fullname|first_name|full_name)\s*\}\}/gi, nameVal);
      processedSignature = processedSignature.replace(/\{\{\s*(full\s*name|name|contact_name|fullname|first_name|full_name)\s*\}\}/gi, nameVal);
    }

    const companyVal =
      contactData.company ||
      contactData['company_name'] ||
      contactData['Company Name'] ||
      contactData['organization'] ||
      '';

    if (companyVal) {
      processedBody = processedBody.replace(/\{\{\s*(company|organization|company_name|org|company\s*name)\s*\}\}/gi, companyVal);
      processedSignature = processedSignature.replace(/\{\{\s*(company|organization|company_name|org|company\s*name)\s*\}\}/gi, companyVal);
    }

    const roleVal =
      contactData.role ||
      contactData['job_title'] ||
      contactData['Job Title'] ||
      contactData['title'] ||
      '';

    if (roleVal) {
      processedBody = processedBody.replace(/\{\{\s*(role|title|job_title|position|job\s*title)\s*\}\}/gi, roleVal);
      processedSignature = processedSignature.replace(/\{\{\s*(role|title|job_title|position|job\s*title)\s*\}\}/gi, roleVal);
    }

    Object.keys(contactData).forEach((key) => {
      const val = contactData[key] !== null && contactData[key] !== undefined ? String(contactData[key]) : '';
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexExact = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
      processedBody = processedBody.replace(regexExact, val);
      processedSignature = processedSignature.replace(regexExact, val);
    });
  }

  processedBody = processedBody.replace(/\[\s*(your\s*name|name|my\s*name|insert\s*name)\s*\]/gi, '');
  processedSignature = processedSignature.replace(/\[\s*(your\s*name|name|my\s*name|insert\s*name)\s*\]/gi, '');

  let result = processedBody.trim();

  if (processedSignature && processedSignature.trim()) {
    result += `\n\n${processedSignature.trim()}`;
  }

  return result;
}
