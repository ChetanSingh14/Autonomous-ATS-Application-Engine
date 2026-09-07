import { JobStatus, JobPosting, UserProfile } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class JobService {
  public async getNextQueuedJob(): Promise<{ job: JobPosting | null; profile: UserProfile | null }> {
    const job = await prisma.jobPosting.findFirst({
      where: { status: JobStatus.QUEUED_FOR_APPLY },
      orderBy: { matchScore: 'desc' },
    });

    if (!job) {
      return { job: null, profile: null };
    }

    const profile = await prisma.userProfile.findFirst();
    return { job, profile };
  }

  public async markJobApplied(
    id: string,
    status: string,
    filledFields?: any
  ): Promise<JobPosting> {
    const finalStatus =
      status === 'REQUIRES_MANUAL_REVIEW'
        ? JobStatus.REQUIRES_MANUAL_REVIEW
        : JobStatus.SUBMITTED;

    const updatedJob = await prisma.jobPosting.update({
      where: { id },
      data: { status: finalStatus },
    });

    await prisma.applicationLog.create({
      data: {
        jobId: id,
        status: finalStatus,
        filledFields: filledFields || {},
        submittedAt: new Date(),
      },
    });

    return updatedJob;
  }

  public async rejectJob(id: string): Promise<JobPosting> {
    return prisma.jobPosting.update({
      where: { id },
      data: {
        status: JobStatus.REJECTED_LOW_SCORE,
        matchReason: 'Manually rejected by candidate from dashboard.',
      },
    });
  }

  public async getDashboardStats(): Promise<{
    discoveredCount: number;
    queuedCount: number;
    submittedCount: number;
    rejectedCount: number;
    jobs: JobPosting[];
  }> {
    const discoveredCount = await prisma.jobPosting.count({ where: { status: JobStatus.DISCOVERED } });
    const queuedCount = await prisma.jobPosting.count({ where: { status: JobStatus.QUEUED_FOR_APPLY } });
    const submittedCount = await prisma.jobPosting.count({ where: { status: JobStatus.SUBMITTED } });
    const rejectedCount = await prisma.jobPosting.count({ where: { status: JobStatus.REJECTED_LOW_SCORE } });

    const jobs = await prisma.jobPosting.findMany({
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return {
      discoveredCount,
      queuedCount,
      submittedCount,
      rejectedCount,
      jobs,
    };
  }

  public async getJobs(status?: string): Promise<JobPosting[]> {
    const whereClause = status && status !== 'ALL' ? { status: status as JobStatus } : {};
    return prisma.jobPosting.findMany({
      where: whereClause,
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  public async getJobById(id: string): Promise<JobPosting | null> {
    return prisma.jobPosting.findUnique({ where: { id } });
  }
}
