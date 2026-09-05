import puppeteer from 'puppeteer';
import { TailoredOutput } from './ai-tailor.service';

export class PDFGeneratorService {
  /**
   * Compiles tailored resume profile data into an ATS-parseable single-column PDF Buffer
   */
  public async renderResumeToBuffer(profile: any, tailored: TailoredOutput): Promise<Buffer> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${profile.firstName} ${profile.lastName} - Resume</title>
  <style>
    @page {
      margin: 12mm 14mm;
      size: letter;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.35;
    }
    .name {
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .contact {
      font-size: 8.5pt;
      color: #374151;
      margin-top: 3px;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #111827;
      margin-top: 10px;
      margin-bottom: 5px;
      padding-bottom: 1px;
      letter-spacing: 0.5px;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
    }
    .entry-sub {
      display: flex;
      justify-content: space-between;
      font-style: italic;
      color: #4b5563;
      font-size: 9pt;
      margin-bottom: 2px;
    }
    ul {
      margin: 2px 0 6px 16px;
      padding: 0;
    }
    li {
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="name">${profile.firstName} ${profile.lastName}</div>
  <div class="contact">
    ${profile.location} &bull; ${profile.email} &bull; ${profile.phone} &bull; ${profile.linkedinUrl} &bull; ${profile.githubUrl}
  </div>

  <div class="section-title">Professional Summary</div>
  <p style="margin: 0 0 6px 0;">${tailored.summary || profile.summary}</p>

  <div class="section-title">Technical Skills</div>
  <p style="margin: 0 0 6px 0;">
    <strong>Core Competencies:</strong> ${(tailored.skills || profile.skills).join(', ')}
  </p>

  <div class="section-title">Work Experience</div>
  ${(tailored.experience || profile.experience)
    .map(
      (exp: any) => `
    <div style="margin-bottom: 6px;">
      <div class="entry-header">
        <span>${exp.company}</span>
        <span>${exp.duration}</span>
      </div>
      <div class="entry-sub">
        <span>${exp.role}</span>
      </div>
      <ul>
        ${exp.highlights.map((h: string) => `<li>${h}</li>`).join('')}
      </ul>
    </div>
  `
    )
    .join('')}

  <div class="section-title">Key Projects</div>
  ${(tailored.projects || profile.projects)
    .map(
      (proj: any) => `
    <div style="margin-bottom: 6px;">
      <div class="entry-header">
        <span>${proj.title}</span>
        <span style="font-weight: normal; font-size: 8.5pt;">${(proj.techStack || []).join(' | ')}</span>
      </div>
      <ul>
        ${proj.description.map((d: string) => `<li>${d}</li>`).join('')}
      </ul>
    </div>
  `
    )
    .join('')}

  ${
    profile.education && profile.education.length > 0
      ? `
    <div class="section-title">Education</div>
    ${profile.education
      .map(
        (edu: any) => `
      <div class="entry-header">
        <span>${edu.institution} &mdash; ${edu.degree}</span>
        <span>${edu.year}</span>
      </div>
    `
      )
      .join('')}
  `
      : ''
  }
</body>
</html>
`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'letter',
        printBackground: true,
        margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      if (browser) await browser.close();
      console.error('[PDFGenerator Error]:', error.message);
      throw error;
    }
  }
}
