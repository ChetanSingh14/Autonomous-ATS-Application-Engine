import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { IngestionService } from '../services/ingestion.service';

export class JobController {
  private jobService: JobService;
  private ingestionService: IngestionService;

  constructor() {
    this.jobService = new JobService();
    this.ingestionService = new IngestionService();
  }

  public getNextQueued = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.jobService.getNextQueuedJob();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  public markApplied = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { filledFields, status } = req.body;
      const updatedJob = await this.jobService.markJobApplied(id, status, filledFields);
      res.status(200).json({ success: true, job: updatedJob });
    } catch (error) {
      next(error);
    }
  };

  public rejectJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedJob = await this.jobService.rejectJob(id);
      res.status(200).json({ success: true, job: updatedJob });
    } catch (error) {
      next(error);
    }
  };

  public getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.jobService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };

  public getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.query;
      const jobs = await this.jobService.getJobs(status as string);
      res.status(200).json({ jobs });
    } catch (error) {
      next(error);
    }
  };

  public getJobById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const job = await this.jobService.getJobById(id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.status(200).json({ job });
    } catch (error) {
      next(error);
    }
  };

  public ingestCustomJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, company, location, url, atsPlatform, description, isRemote, externalId } = req.body;

      if (!url || !title) {
        res.status(400).json({ error: 'Both title and url are required fields.' });
        return;
      }

      const result = await this.ingestionService.ingestCustomJob({
        title,
        company: company || 'Company',
        location: location || 'Remote',
        url,
        atsPlatform,
        description: description || `<p>${title} at ${company || 'Company'}</p>`,
        isRemote,
        externalId,
      });

      if (!result.success) {
        res.status(500).json({ error: result.message });
        return;
      }

      res.status(200).json({ success: true, jobId: result.jobId, message: result.message });
    } catch (error) {
      next(error);
    }
  };
}
