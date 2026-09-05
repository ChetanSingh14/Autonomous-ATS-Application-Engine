import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding Chetan Singh Master Candidate Profile...');

  // Clear existing profiles to maintain Chetan Singh as the master candidate of record
  await prisma.userProfile.deleteMany({});

  const masterProfile = await prisma.userProfile.create({
    data: {
      firstName: 'Chetan',
      lastName: 'Singh',
      email: 'email-siradhanachetan14@gmail.com',
      phone: '+91-9354864420',
      location: 'Noida, India',
      linkedinUrl: 'https://linkedin.com/in/chetansingh14',
      githubUrl: 'https://github.com/ChetanSingh14',
      portfolioUrl: 'https://chetansingh.dev',
      targetRoles: [
        'Full Stack Engineer',
        'MERN Stack Developer',
        'Android Developer',
        'Frontend Developer',
        'Backend Developer',
        'Software Engineer'
      ],
      skills: [
        'Node.js',
        'Express.js',
        'FastAPI',
        'MongoDB',
        'PostgreSQL',
        'MySQL',
        'Redis',
        'Prisma',
        'Mongoose',
        'Supabase',
        'REST APIs',
        'JavaScript (ES6+)',
        'TypeScript',
        'Python',
        'HTML5',
        'CSS3',
        'Java (DSA)',
        'React.js',
        'Next.js',
        'Zustand',
        'Angular (v14+)',
        'Tailwind CSS',
        'Material UI',
        'React Native (Expo, CLI)',
        'AWS',
        'GCP',
        'Vercel',
        'Nginx',
        'BullMQ',
        'Git',
        'GitHub',
        'Postman',
        'Linux',
        'JIRA',
        'GitHub Actions (CI/CD)',
        'GitHub Apps',
        'Octokit',
        'Stripe',
        'PayU',
        'Cashfree',
        'ePay',
        'Razorpay',
        'Webhook Integrations',
        'Socket.IO',
        'Real-time Notifications',
        'Event-driven Architecture',
        'Server-Sent Events',
        'AST Static Analysis'
      ],
      yearsExperience: 2,
      summary:
        'Full Stack and Mobile Engineer with expertise across the MERN stack, TypeScript, and high-performance Android development. Proven track record at Insanger Pvt Ltd and Times Internet delivering scalable cross-platform mobile architectures, real-time ranking algorithms, and virtual economy integrations. Adept at optimizing server infrastructure with Nginx and AWS, managing cloud-to-mobile data pipelines, and writing efficient, production-ready code backed by strong Data Structures and Algorithms (DSA) foundations.',
      experience: [
        {
          company: 'Insanger Technologies Private Limited',
          role: 'Full Stack MERN | Android Developer',
          duration: 'March 2025 – Present',
          highlights: [
            "Virtual Economy Architecture: Spearheaded the design of a secure transactional system ('Backpack Store'), enabling users to trade items with virtual currency, which increased user retention by 20%.",
            'High-Performance Ranking System: Constructed a live leaderboard using optimized PostgreSQL transactional integrity, reducing query latency to under 50ms for real-time user earning updates.',
            'Infrastructure Optimization: Orchestrated the deployment of production servers on AWS with Nginx load balancing, handling concurrent traffic spikes while maintaining 99.9% uptime.',
            'Admin Dashboard Efficiency: Revamped the internal Admin Panel for content moderation, delivering real-time analytics that reduced manual administrative workload by 30%.',
            'Scalable Social Features: Engineered robust backend logic for high-volume social interactions (Posts, Likes, Comments), optimizing database schemas to handle 10k+ daily write operations.'
          ]
        },
        {
          company: 'Times Internet',
          role: 'Frontend Developer Intern',
          duration: 'Previous Experience',
          highlights: [
            'Dynamic Interface Engineering: Enhanced the SPOG portal (times.spog.ai) by building dynamic issue creation modules, standardizing complex forms for Incidents, Problems, and IT Helpdesk tickets.',
            'Frontend Performance: Implemented responsive UI components using Angular (v14+) and Python FastAPI, improving page load speeds and cross-device compatibility.',
            'Agile Workflow Integration: Collaborated within an Agile environment using Atlassian JIRA, contributing to daily standups and ensuring timely delivery of sprint tasks.'
          ]
        }
      ],
      projects: [
        {
          title: 'DevSecOps AI Code Reviewer',
          techStack: ['Next.js', 'Express.js', 'TypeScript', 'Gemini 2.5 Flash', 'Pinecone', 'Upstash Redis', 'Monaco Editor'],
          description: [
            'Architected an end-to-end DevSecOps platform integrating a local AST scanner (< 5ms), Gemini SSE streaming (< 1s), and Pinecone vector caching (<= 50ms) with RAG-based repository rule enforcement.',
            'Automated code audits and developer workflows by deploying an HMAC-verified GitHub App for inline PR comments, Monaco IDE diff previews, and Socket.io real-time chat sessions for review disputes.'
          ]
        },
        {
          title: 'Cab Booking Application Clone',
          techStack: ['React Native', 'Node.js', 'MongoDB'],
          description: [
            'Delivered a full-featured mobile app with real-time tracking, utilizing geospatial queries to achieve accurate driver-user matching.',
            'Formulated complex fare calculation algorithms based on distance and time metrics, ensuring precision in billing logic.'
          ]
        },
        {
          title: 'UecoHub',
          techStack: ['Next.js', 'React Native', 'Node.js', 'TypeScript', 'AWS', 'PayU', 'Socket.io'],
          description: [
            'Spearheaded end-to-end development as Tech Lead, managing two interns to single-handedly architect and deploy a production-ready influencer content delivery ecosystem across an Android app and Next.js admin console.',
            'Engineered low-latency infrastructure on AWS featuring secure PayU payment integration, bi-directional real-time chat, automated notifications, and optimized TypeScript data pipelines for scalable performance.'
          ]
        }
      ],
      education: [
        {
          institution: 'Polaris School of Technology, Gurugram, India',
          degree: 'Bachelor of Technology (B.Tech) in Computer Science',
          year: '2023 – 2027'
        }
      ]
    }
  });

  console.log(`[Seed Success] Chetan Singh Master Profile created (ID: ${masterProfile.id})`);
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
