import axios from 'axios';
import crypto from 'crypto';
import { PrismaClient, ATSPlatform, JobStatus } from '@prisma/client';
import { evaluateQueue } from '../queue';

const prisma = new PrismaClient();

export class IngestionService {
  /**
   * Generates a deterministic MD5 hash string to prevent duplicate job ingestion
   */
  private generateFingerprint(company: string, title: string, location: string): string {
    const raw = `${company.toLowerCase().trim()}_${title.toLowerCase().trim()}_${location.toLowerCase().trim()}`;
    return crypto.createHash('md5').update(raw).digest('hex');
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

        const existing = await prisma.jobPosting.findUnique({ where: { fingerprint } });
        if (existing) continue;

        const newJob = await prisma.jobPosting.create({
          data: {
            externalId: job.id.toString(),
            fingerprint,
            title: job.title,
            company: companySlug,
            location: locationName,
            isRemote,
            url: job.absolute_url,
            atsPlatform: ATSPlatform.GREENHOUSE,
            description: job.content || `<p>${job.title} at ${companySlug}</p>`,
            status: JobStatus.DISCOVERED,
          },
        });

        // Enqueue job for background scoring & tailoring worker
        await evaluateQueue.add('evaluate-job', { jobId: newJob.id });
        count++;
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

        const existing = await prisma.jobPosting.findUnique({ where: { fingerprint } });
        if (existing) continue;

        const newJob = await prisma.jobPosting.create({
          data: {
            externalId: job.id,
            fingerprint,
            title: job.text,
            company: companySlug,
            location: locationName,
            isRemote,
            url: job.hostedUrl,
            atsPlatform: ATSPlatform.LEVER,
            description: job.descriptionPlain || job.description || job.text,
            status: JobStatus.DISCOVERED,
          },
        });

        await evaluateQueue.add('evaluate-job', { jobId: newJob.id });
        count++;
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

        const existing = await prisma.jobPosting.findUnique({ where: { fingerprint } });
        if (existing) continue;

        const newJob = await prisma.jobPosting.create({
          data: {
            externalId: job.id,
            fingerprint,
            title: job.title,
            company: companySlug,
            location: locationName,
            isRemote: locationName.toLowerCase().includes('remote'),
            url: job.jobUrl || `https://jobs.ashbyhq.com/${companySlug}/${job.id}`,
            atsPlatform: ATSPlatform.ASHBY,
            description: job.descriptionHtml || job.title,
            status: JobStatus.DISCOVERED,
          },
        });

        await evaluateQueue.add('evaluate-job', { jobId: newJob.id });
        count++;
      }

      console.log(`[Ingestion] Ingested ${count} new Ashby jobs for '${companySlug}'`);
      return count;
    } catch (error: any) {
      console.error(`[Ingestion Error] Ashby fetch failed for '${companySlug}':`, error.message);
      return 0;
    }
  }

  /**
   * Triggers comprehensive batch ingestion across 25+ major tech companies (Greenhouse, Lever, Ashby)
   */
  public async triggerBatchIngestion(): Promise<{ totalIngested: number }> {
    const greenhouseSlugs = [
      'stripe', 'airbnb', 'figma', 'discord', 'vercel', 'hashicorp', 'supabase',
      'datadog', 'coinbase', 'doordash', 'uber', 'ramp', 'retool', 'slack', 'gitlab'
    ];
    const leverSlugs = ['netflix', 'palantir', 'cloudflare', 'spotify', 'postman'];
    const ashbySlugs = ['openai', 'linear', 'notion', 'replit', 'cursor'];

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
