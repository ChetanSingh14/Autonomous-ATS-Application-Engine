import axios from 'axios';
import crypto from 'crypto';
import { ATSPlatform, JobStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { evaluateQueue } from '../queue';

export interface CustomJobInput {
  title: string;
  company: string;
  location?: string;
  url: string;
  atsPlatform?: ATSPlatform | string;
  description: string;
  isRemote?: boolean;
  externalId?: string;
}

export class IngestionService {
  /**
   * Generates a deterministic MD5 hash string to prevent duplicate job ingestion
   */
  private generateFingerprint(company: string, title: string, location: string): string {
    const raw = `${company.toLowerCase().trim()}_${title.toLowerCase().trim()}_${location.toLowerCase().trim()}`;
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  /**
   * Safely creates a JobPosting record while ignoring duplicate fingerprint or url errors
   */
  private async safeCreateAndEnqueue(data: {
    externalId: string;
    fingerprint: string;
    title: string;
    company: string;
    location: string;
    isRemote: boolean;
    url: string;
    atsPlatform: ATSPlatform;
    description: string;
  }): Promise<boolean> {
    try {
      const existing = await prisma.jobPosting.findFirst({
        where: {
          OR: [{ fingerprint: data.fingerprint }, { url: data.url }],
        },
      });

      if (existing) {
        return false;
      }

      const newJob = await prisma.jobPosting.create({
        data: {
          ...data,
          status: JobStatus.DISCOVERED,
        },
      });

      await evaluateQueue.add('evaluate-job', { jobId: newJob.id });
      return true;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return false;
      }
      console.error(`[Ingestion Warning] Failed to create job '${data.title}':`, error.message);
      return false;
    }
  }

  /**
   * Ingests a custom job from LinkedIn, Naukri, Wellfound, Internshala, Workday, or any direct URL
   */
  public async ingestCustomJob(input: CustomJobInput): Promise<{ success: boolean; jobId?: string; message: string }> {
    const company = input.company.trim() || 'Unknown Company';
    const title = input.title.trim() || 'Software Engineer';
    const location = input.location?.trim() || 'Remote';
    const fingerprint = this.generateFingerprint(company, title, location);
    const isRemote = input.isRemote ?? location.toLowerCase().includes('remote');

    let platform: ATSPlatform = ATSPlatform.CUSTOM;
    if (input.atsPlatform) {
      const upper = input.atsPlatform.toUpperCase();
      if (Object.values(ATSPlatform).includes(upper as ATSPlatform)) {
        platform = upper as ATSPlatform;
      }
    }

    try {
      const existing = await prisma.jobPosting.findFirst({
        where: {
          OR: [{ fingerprint }, { url: input.url }],
        },
      });

      if (existing) {
        return { success: true, jobId: existing.id, message: 'Job already exists in application engine queue.' };
      }

      const newJob = await prisma.jobPosting.create({
        data: {
          externalId: input.externalId || crypto.randomUUID(),
          fingerprint,
          title,
          company,
          location,
          isRemote,
          url: input.url,
          atsPlatform: platform,
          description: input.description || `<p>${title} at ${company}</p>`,
          status: JobStatus.DISCOVERED,
        },
      });

      await evaluateQueue.add('evaluate-job', { jobId: newJob.id });
      console.log(`[Custom Ingestion] Ingested ${platform} job: '${title}' at '${company}'`);
      return { success: true, jobId: newJob.id, message: 'Successfully queued job for scoring & tailoring.' };
    } catch (error: any) {
      console.error('[Custom Ingestion Error]:', error.message);
      return { success: false, message: `Failed to ingest job: ${error.message}` };
    }
  }

  /**
   * Ingests all active jobs from Greenhouse public JSON API
   */
  public async fetchGreenhouseBoard(companySlug: string): Promise<number> {
    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`;
    let count = 0;

    try {
      const response = await axios.get<{ jobs: any[] }>(endpoint, { timeout: 10000 });
      const jobs = response.data.jobs || [];

      for (const job of jobs) {
        const locationName = job.location?.name || 'Remote';
        const fingerprint = this.generateFingerprint(companySlug, job.title, locationName);
        const isRemote = locationName.toLowerCase().includes('remote');

        const created = await this.safeCreateAndEnqueue({
          externalId: job.id.toString(),
          fingerprint,
          title: job.title,
          company: companySlug,
          location: locationName,
          isRemote,
          url: job.absolute_url,
          atsPlatform: ATSPlatform.GREENHOUSE,
          description: job.content || `<p>${job.title} at ${companySlug}</p>`,
        });

        if (created) count++;
      }

      console.log(`[Ingestion] Ingested ${count} new Greenhouse jobs for '${companySlug}'`);
      return count;
    } catch (error: any) {
      console.error(`[Ingestion Error] Greenhouse fetch failed for '${companySlug}':`, error.message);
      return 0;
    }
  }

  /**
   * Ingests all active jobs from Lever public JSON API
   */
  public async fetchLeverBoard(companySlug: string): Promise<number> {
    const endpoint = `https://api.lever.co/v0/postings/${companySlug}?mode=json`;
    let count = 0;

    try {
      const response = await axios.get<any[]>(endpoint, { timeout: 10000 });
      const jobs = response.data || [];

      for (const job of jobs) {
        const locationName = job.categories?.location || 'Remote';
        const fingerprint = this.generateFingerprint(companySlug, job.text, locationName);
        const isRemote = locationName.toLowerCase().includes('remote') || job.workplaceType === 'remote';

        const created = await this.safeCreateAndEnqueue({
          externalId: job.id,
          fingerprint,
          title: job.text,
          company: companySlug,
          location: locationName,
          isRemote,
          url: job.hostedUrl,
          atsPlatform: ATSPlatform.LEVER,
          description: job.descriptionPlain || job.description || job.text,
        });

        if (created) count++;
      }

      console.log(`[Ingestion] Ingested ${count} new Lever jobs for '${companySlug}'`);
      return count;
    } catch (error: any) {
      console.error(`[Ingestion Error] Lever fetch failed for '${companySlug}':`, error.message);
      return 0;
    }
  }

  /**
   * Ingests all active jobs from Ashby public JSON API
   */
  public async fetchAshbyBoard(companySlug: string): Promise<number> {
    const endpoint = `https://api.ashbyhq.com/posting-api/job-board/${companySlug}`;
    let count = 0;

    try {
      const response = await axios.get<{ jobs: any[] }>(endpoint, { timeout: 10000 });
      const jobs = response.data.jobs || [];

      for (const job of jobs) {
        const locationName = job.location || 'Remote';
        const fingerprint = this.generateFingerprint(companySlug, job.title, locationName);

        const created = await this.safeCreateAndEnqueue({
          externalId: job.id,
          fingerprint,
          title: job.title,
          company: companySlug,
          location: locationName,
          isRemote: locationName.toLowerCase().includes('remote'),
          url: job.jobUrl || `https://jobs.ashbyhq.com/${companySlug}/${job.id}`,
          atsPlatform: ATSPlatform.ASHBY,
          description: job.descriptionHtml || job.title,
        });

        if (created) count++;
      }

      console.log(`[Ingestion] Ingested ${count} new Ashby jobs for '${companySlug}'`);
      return count;
    } catch (error: any) {
      console.error(`[Ingestion Error] Ashby fetch failed for '${companySlug}':`, error.message);
      return 0;
    }
  }

  /**
   * Triggers comprehensive batch ingestion across 50+ top tech companies (Greenhouse, Lever, Ashby)
   */
  public async triggerBatchIngestion(): Promise<{ totalIngested: number }> {
    const greenhouseSlugs = [
      'stripe', 'airbnb', 'figma', 'discord', 'vercel', 'hashicorp', 'supabase',
      'datadog', 'coinbase', 'doordash', 'uber', 'ramp', 'retool', 'slack', 'gitlab',
      'instacart', 'plaid', 'robinhood', 'brex', 'benchling', 'affirm', 'gusto', 'databricks'
    ];
    const leverSlugs = [
      'netflix', 'palantir', 'cloudflare', 'spotify', 'postman', 'atlassian', 'box', 'asana', 'hubspot'
    ];
    const ashbySlugs = [
      'openai', 'linear', 'notion', 'replit', 'cursor', 'anthropic', 'scale', 'modal', 'perplexity', 'pinecone'
    ];

    let total = 0;
    for (const slug of greenhouseSlugs) {
      total += await this.fetchGreenhouseBoard(slug);
    }
    for (const slug of leverSlugs) {
      total += await this.fetchLeverBoard(slug);
    }
    for (const slug of ashbySlugs) {
      total += await this.fetchAshbyBoard(slug);
    }

    return { totalIngested: total };
  }
}
