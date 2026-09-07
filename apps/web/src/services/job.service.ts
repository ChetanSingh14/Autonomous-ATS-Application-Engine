import { ApiClient } from './api.client';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  atsPlatform: string;
  matchScore: number | null;
  status: string;
  url: string;
  missingSkills: string[];
  matchedSkills?: string[];
  tailoredSummary?: string;
  tailoredPdf?: string;
  description?: string;
  createdAt: string;
}

export interface DashboardStats {
  discoveredCount: number;
  queuedCount: number;
  submittedCount: number;
  rejectedCount: number;
  jobs: JobPosting[];
}

export interface CustomJobPayload {
  title: string;
  company: string;
  location?: string;
  url: string;
  atsPlatform?: string;
  description?: string;
  isRemote?: boolean;
}

export class FrontendJobService {
  public static async getDashboardStats(): Promise<DashboardStats> {
    const res = await ApiClient.get<DashboardStats>('/jobs/dashboard-stats');
    return (
      res || {
        discoveredCount: 0,
        queuedCount: 0,
        submittedCount: 0,
        rejectedCount: 0,
        jobs: [],
      }
    );
  }

  public static async getJobsByStatus(status: string): Promise<JobPosting[]> {
    const endpoint = status === 'ALL' ? '/jobs' : `/jobs?status=${status}`;
    const res = await ApiClient.get<{ jobs: JobPosting[] }>(endpoint);
    return res?.jobs || [];
  }

  public static async getJobById(id: string): Promise<JobPosting | null> {
    const res = await ApiClient.get<{ job: JobPosting }>(`/jobs/${id}`);
    return res?.job || null;
  }

  public static async rejectJob(id: string): Promise<boolean> {
    const res = await ApiClient.post<{ success: boolean }>(`/jobs/${id}/reject`);
    return Boolean(res?.success);
  }

  public static async ingestCustomJob(payload: CustomJobPayload): Promise<boolean> {
    const res = await ApiClient.post<{ success: boolean }>('/jobs/ingest-custom', payload);
    return Boolean(res?.success);
  }

  public static async triggerBoardIngestion(): Promise<boolean> {
    const res = await ApiClient.post<{ success: boolean }>('/ingest');
    return Boolean(res?.success);
  }
}
