import { PrismaClient, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function fastClean() {
  const developerKeywords = [
    'engineer', 'developer', 'frontend', 'backend', 'fullstack', 'full stack',
    'software', 'code', 'react', 'node', 'typescript', 'javascript', 'python', 'java', 'web', 'data', 'cloud', 'systems', 'android'
  ];

  const queuedJobs = await prisma.jobPosting.findMany({
    where: { status: JobStatus.QUEUED_FOR_APPLY },
    select: { id: true, title: true }
  });

  const idsToPurge: string[] = [];

  for (const job of queuedJobs) {
    const lowerTitle = job.title.toLowerCase();
    const isDevRole = developerKeywords.some((kw) => lowerTitle.includes(kw));
    if (!isDevRole) {
      idsToPurge.push(job.id);
    }
  }

  if (idsToPurge.length > 0) {
    await prisma.jobPosting.updateMany({
      where: { id: { in: idsToPurge } },
      data: {
        status: JobStatus.REJECTED_LOW_SCORE,
        matchScore: 0,
        matchReason: 'Auto-rejected: Role category does not match software engineering/developer profile.',
      },
    });
  }

  console.log(`[Fast Clean] Successfully purged ${idsToPurge.length} non-developer jobs from queue! ${queuedJobs.length - idsToPurge.length} developer jobs remaining.`);
}

fastClean()
  .catch((e) => console.error('[Fast Clean Error]:', e))
  .finally(async () => await prisma.$disconnect());
