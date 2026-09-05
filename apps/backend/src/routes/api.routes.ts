import { Router, Request, Response } from 'express';
import { PrismaClient, JobStatus } from '@prisma/client';
import { AITailorService } from '../services/ai-tailor.service';
import { IngestionService } from '../services/ingestion.service';
import pdfParse from 'pdf-parse';

const router = Router();
const prisma = new PrismaClient();
const aiService = new AITailorService();
const ingestionService = new IngestionService();

/**
 * GET /api/jobs/next-queued
 */
router.get('/jobs/next-queued', async (req: Request, res: Response) => {
  try {
    const job = await prisma.jobPosting.findFirst({
      where: { status: JobStatus.QUEUED_FOR_APPLY },
      orderBy: { matchScore: 'desc' },
    });

    if (!job) {
      return res.status(200).json({ job: null, profile: null });
    }

    const profile = await prisma.userProfile.findFirst();
    return res.status(200).json({ job, profile });
  } catch (error: any) {
    console.error('[API Error] /jobs/next-queued:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/answer-question
 */
router.post('/ai/answer-question', async (req: Request, res: Response) => {
  const { question, fieldType, options } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question field is required' });
  }

  try {
    const profile = await prisma.userProfile.findFirst();
    const answer = await aiService.answerDynamicQuestion(
      question,
      fieldType || 'text',
      options,
      profile
    );

    return res.status(200).json({ answer });
  } catch (error: any) {
    console.error('[API Error] /ai/answer-question:', error.message);
    return res.status(500).json({ answer: options && options.length > 0 ? options[0] : 'Yes' });
  }
});

/**
 * POST /api/jobs/:id/applied
 */
router.post('/jobs/:id/applied', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filledFields, status } = req.body;

  try {
    const finalStatus = status === 'REQUIRES_MANUAL_REVIEW' ? JobStatus.REQUIRES_MANUAL_REVIEW : JobStatus.SUBMITTED;

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

    return res.status(200).json({ success: true, job: updatedJob });
  } catch (error: any) {
    console.error(`[API Error] /jobs/${id}/applied:`, error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/dashboard-stats
 * Aggregates live application metrics and returns postings for dashboard
 */
router.get('/jobs/dashboard-stats', async (req: Request, res: Response) => {
  try {
    const discoveredCount = await prisma.jobPosting.count({ where: { status: JobStatus.DISCOVERED } });
    const queuedCount = await prisma.jobPosting.count({ where: { status: JobStatus.QUEUED_FOR_APPLY } });
    const submittedCount = await prisma.jobPosting.count({ where: { status: JobStatus.SUBMITTED } });
    const rejectedCount = await prisma.jobPosting.count({ where: { status: JobStatus.REJECTED_LOW_SCORE } });

    const jobs = await prisma.jobPosting.findMany({
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return res.status(200).json({
      discoveredCount,
      queuedCount,
      submittedCount,
      rejectedCount,
      jobs,
    });
  } catch (error: any) {
    console.error('[API Error] /jobs/dashboard-stats:', error.message);
    return res.status(500).json({
      discoveredCount: 0,
      queuedCount: 0,
      submittedCount: 0,
      rejectedCount: 0,
      jobs: [],
    });
  }
});

/**
 * GET /api/jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  const { status } = req.query;

  try {
    const whereClause = status && status !== 'ALL' ? { status: status as JobStatus } : {};
    const jobs = await prisma.jobPosting.findMany({
      where: whereClause,
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return res.status(200).json({ jobs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/:id
 */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.status(200).json({ job });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/profile
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findFirst();
    return res.status(200).json({ profile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/profile
 */
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findFirst();
    if (!profile) {
      const created = await prisma.userProfile.create({ data: req.body });
      return res.status(200).json({ profile: created });
    }

    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data: req.body,
    });

    return res.status(200).json({ profile: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/profile/parse-resume
 */
router.post('/profile/parse-resume', async (req: Request, res: Response) => {
  const { resumeText, resumePdfBase64 } = req.body;

  let extractedText = resumeText || '';

  if (resumePdfBase64) {
    try {
      const buffer = Buffer.from(resumePdfBase64, 'base64');
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text || '';
    } catch (err: any) {
      console.error('[PDF Parse Error]:', err.message);
      return res.status(400).json({ error: `Could not parse PDF file: ${err.message}` });
    }
  }

  if (!extractedText.trim()) {
    return res.status(400).json({ error: 'No resume text or PDF content provided' });
  }

  try {
    const parsedData = await aiService.parseRawResumeText(extractedText);

    const existingProfile = await prisma.userProfile.findFirst();
    let profile;

    if (existingProfile) {
      profile = await prisma.userProfile.update({
        where: { id: existingProfile.id },
        data: parsedData,
      });
    } else {
      profile = await prisma.userProfile.create({ data: parsedData });
    }

    return res.status(200).json({ success: true, profile });
  } catch (error: any) {
    console.error('[Parse Resume Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ingest
 */
router.post('/ingest', async (req: Request, res: Response) => {
  const { companySlug, platform } = req.body;

  try {
    let count = 0;
    if (companySlug) {
      if (platform === 'LEVER') {
        count = await ingestionService.fetchLeverBoard(companySlug);
      } else {
        count = await ingestionService.fetchGreenhouseBoard(companySlug);
      }
    } else {
      const result = await ingestionService.triggerBatchIngestion();
      count = result.totalIngested;
    }

    return res.status(200).json({ success: true, count });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
