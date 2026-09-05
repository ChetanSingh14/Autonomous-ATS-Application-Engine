import { Worker, Job } from 'bullmq';
import { PrismaClient, JobStatus } from '@prisma/client';
import { redisConnection } from '../queue';
import { AITailorService } from '../services/ai-tailor.service';
import { PDFGeneratorService } from '../services/pdf-generator.service';

const prisma = new PrismaClient();
const tailorService = new AITailorService();
const pdfService = new PDFGeneratorService();

export const applicationWorker = new Worker(
  'evaluate-job',
  async (job: Job<{ jobId: string }>) => {
    const { jobId } = job.data;
    console.log(`[Worker] Processing job evaluation task for Job ID: ${jobId}`);

    const jobPosting = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    const masterProfile = await prisma.userProfile.findFirst();

    if (!jobPosting) {
      console.warn(`[Worker Warning] JobPosting with ID '${jobId}' not found.`);
      return;
    }

    if (!masterProfile) {
      console.warn('[Worker Warning] No Master Profile found in database. Please run seed script first.');
      return;
    }

    // Step 1: Update status to EVALUATING
    await prisma.jobPosting.update({
      where: { id: jobId },
      data: { status: JobStatus.EVALUATING },
    });

    // Step 2: Calculate fit score & reorder skills/bullets
    const tailored = await tailorService.evaluateAndTailor(
      masterProfile,
      jobPosting.title,
      jobPosting.description
    );

    // Step 3: Hard Score Gate (< 65% triggers immediate halt to conserve resources)
    if (tailored.atsScore < 65) {
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          status: JobStatus.REJECTED_LOW_SCORE,
          matchScore: tailored.atsScore,
          missingSkills: tailored.missingSkills,
          matchedSkills: tailored.matchedSkills,
          matchReason: `Match score ${tailored.atsScore}% is below the 65% minimum threshold.`,
        },
      });
      console.log(`[Worker] REJECTED_LOW_SCORE (${tailored.atsScore}%): ${jobPosting.title} at ${jobPosting.company}`);
      return;
    }

    // Step 4: Resume Tailoring & In-Memory PDF Compilation
    await prisma.jobPosting.update({
      where: { id: jobId },
      data: { status: JobStatus.TAILORING },
    });

    try {
      const pdfBuffer = await pdfService.renderResumeToBuffer(masterProfile, tailored);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Step 5: Mark ready for Chrome Extension runner
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          status: JobStatus.QUEUED_FOR_APPLY,
          matchScore: tailored.atsScore,
          missingSkills: tailored.missingSkills,
          matchedSkills: tailored.matchedSkills,
          tailoredSummary: tailored.summary,
          tailoredPdf: pdfBase64,
        },
      });

      console.log(`[Worker SUCCESS] QUEUED_FOR_APPLY (${tailored.atsScore}%): ${jobPosting.title} at ${jobPosting.company}`);
    } catch (error: any) {
      console.error(`[Worker Error] PDF Compilation failed for job '${jobPosting.title}':`, error.message);
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          matchReason: `PDF compilation error: ${error.message}`,
        },
      });
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Maximum 2 concurrent tailoring tasks to respect rate limits
  }
);

applicationWorker.on('failed', (job, err) => {
  console.error(`[Worker Job Failed] Task ${job?.id} failed with error:`, err.message);
});
