import { PrismaClient, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanQueuedJobs() {
  console.log('[Cleanup] Re-evaluating existing queued jobs to purge non-developer roles...');

  const developerKeywords = [
    'engineer', 'developer', 'frontend', 'backend', 'fullstack', 'full stack',
    'software', 'code', 'react', 'node', 'typescript', 'javascript', 'python', 'java', 'web', 'data', 'cloud', 'systems', 'android'
  ];

  const queuedJobs = await prisma.jobPosting.findMany({
    where: { status: JobStatus.QUEUED_FOR_APPLY },
  });

  let purgedCount = 0;
  let keptCount = 0;

  for (const job of queuedJobs) {
    const lowerTitle = job.title.toLowerCase();
    const isDevRole = developerKeywords.some((kw) => lowerTitle.includes(kw));

    if (!isDevRole) {
      await prisma.jobPosting.update({
        where: { id: job.id },
        data: {
          status: JobStatus.REJECTED_LOW_SCORE,
          matchScore: 0,
          matchReason: 'Auto-rejected: Role category does not match software engineering/developer profile.',
        },
      });
      purgedCount++;
    } else {
      keptCount++;
    }
  }

  console.log(`[Cleanup Complete] Purged ${purgedCount} non-developer jobs from queue. Kept ${keptCount} genuine developer jobs!`);
}

cleanQueuedJobs()
  .catch((e) => console.error('[Cleanup Error]:', e))
  .finally(async () => await prisma.$disconnect());
