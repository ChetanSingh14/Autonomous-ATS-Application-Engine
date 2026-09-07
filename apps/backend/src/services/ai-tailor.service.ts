import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { config } from '../config';

export interface TailoredOutput {
  atsScore: number;
  shouldApply: boolean;
  missingSkills: string[];
  matchedSkills: string[];
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    highlights: string[];
  }>;
  projects: Array<{
    title: string;
    techStack: string[];
    description: string[];
  }>;
}

export class AITailorService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }

  /**
   * Supports both standard AI Studio API keys (AIzaSy...) and OAuth Auth keys (AQ.Ab8...)
   */
  public async generateContentWithFallback(prompt: string): Promise<string> {
    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-pro',
    ];

    const apiKey = config.geminiApiKey.trim();
    const isOAuthAuthKey = apiKey.startsWith('AQ.');

    // Method 1: If using OAuth Auth Key (AQ.Ab8...), send Bearer Token header
    if (isOAuthAuthKey) {
      for (const modelName of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
          const response = await axios.post(
            url,
            {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'x-goog-api-key': apiKey,
              },
              timeout: 15000,
            }
          );

          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().startsWith('{')) {
            return text;
          }
        } catch (err: any) {
          // Try next candidate model
        }
      }
    }

    // Method 2: SDK call with standard API key (AIzaSy...)
    for (const modelName of candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().startsWith('{')) {
          return text;
        }
      } catch (err: any) {
        // Try next model
      }
    }

    // Method 3: Standard REST API call with ?key parameter fallback
    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().startsWith('{')) {
          return text;
        }
      } catch (err: any) {
        // Try next REST model
      }
    }

    throw new Error('All Gemini API connection methods failed. Please check your key in Google AI Studio.');
  }

  /**
   * Parses raw text or PDF content into a structured UserProfile JSON
   */
  public async parseRawResumeText(extractedText: string): Promise<any> {
    const prompt = `
You are a professional technical recruiter and resume parser. Extract the candidate's exact profile details from this resume content.

Resume Content:
${extractedText.slice(0, 10000)}

Respond with JSON matching this exact schema:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedinUrl": "string",
  "githubUrl": "string",
  "portfolioUrl": "string",
  "targetRoles": ["string"],
  "skills": ["string"],
  "yearsExperience": number,
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "techStack": ["string"],
      "description": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string"
    }
  ]
}
`;

    const text = await this.generateContentWithFallback(prompt);
    return JSON.parse(text);
  }

  /**
   * Scores candidate compatibility and tailors existing experience without hallucination
   */
  public async evaluateAndTailor(
    masterProfile: any,
    jobTitle: string,
    jobDescription: string
  ): Promise<TailoredOutput> {
    const developerKeywords = [
      'engineer', 'developer', 'frontend', 'backend', 'fullstack', 'full stack',
      'software', 'code', 'react', 'node', 'typescript', 'javascript', 'python', 'java', 'web', 'data', 'cloud', 'systems', 'android'
    ];
    const lowerTitle = jobTitle.toLowerCase();
    const isDevRole = developerKeywords.some(kw => lowerTitle.includes(kw));

    if (!isDevRole) {
      console.log(`[Role Filter] Non-developer title detected: '${jobTitle}' -> Auto-rejecting with 0% score.`);
      return {
        atsScore: 0,
        shouldApply: false,
        missingSkills: ['Non-developer role category'],
        matchedSkills: [],
        summary: masterProfile.summary || '',
        skills: masterProfile.skills || [],
        experience: masterProfile.experience || [],
        projects: masterProfile.projects || [],
      };
    }

    const prompt = `
You are an expert technical recruiter and ATS (Applicant Tracking System) optimization engine.

CRITICAL OPERATING RULES (ZERO-HALLUCINATION POLICY):
1. TRUTH CONSTRAINT: You MUST NOT invent, hallucinate, or fabricate any company, job title, degree, experience, technology, or metric not present in the candidate's Master Profile.
2. TERMINOLOGY ALIGNMENT: Rephrase the candidate's existing factual accomplishment bullets using exact terms and keywords from the Job Description ONLY where the candidate actually demonstrated that skill.
3. SKILL REORDERING: Order the candidate's existing verified skills so that skills directly mentioned in the Job Description appear first.
4. REALISTIC FIT SCORING: Calculate a realistic ATS Match Score (0 to 100) based on role requirements vs candidate capabilities. If the candidate lacks core required tech stack, assign a score below 60%.

Candidate Master Profile:
${JSON.stringify(masterProfile, null, 2)}

Target Job Description:
Title: ${jobTitle}
Content: ${jobDescription.slice(0, 4500)}

Respond with a JSON object matching this exact schema:
{
  "atsScore": number,
  "shouldApply": boolean,
  "missingSkills": ["string"],
  "matchedSkills": ["string"],
  "summary": "string",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "techStack": ["string"],
      "description": ["string"]
    }
  ]
}
`;

    try {
      const text = await this.generateContentWithFallback(prompt);
      return JSON.parse(text) as TailoredOutput;
    } catch (error: any) {
      console.error('[AITailorService Error]:', error.message);
      return {
        atsScore: 0,
        shouldApply: false,
        missingSkills: ['AI API evaluation error'],
        matchedSkills: [],
        summary: masterProfile.summary || '',
        skills: masterProfile.skills || [],
        experience: masterProfile.experience || [],
        projects: masterProfile.projects || [],
      };
    }
  }

  /**
   * Resolves dynamic screening questions asked on job application forms (e.g. Greenhouse/Lever)
   */
  public async answerDynamicQuestion(
    question: string,
    fieldType: string,
    options: string[] | undefined,
    masterProfile: any
  ): Promise<string> {
    const prompt = `
You are an automated job application assistant filling out a job application form for a candidate.

Candidate Profile:
${JSON.stringify(masterProfile, null, 2)}

Form Question: "${question}"
Field Type: "${fieldType}"
Available Options (if dropdown/radio): ${JSON.stringify(options || [])}

Instructions:
- If available options are provided, select the EXACT string match of the best option.
- For years of experience questions, calculate or infer accurately (default to ${masterProfile.yearsExperience || 4}).
- For work authorization / US sponsorship: Candidate is authorized to work in the US and does NOT require sponsorship, unless specified otherwise.
- Keep text answers professional, concise, and direct.

Return JSON in this format:
{
  "answer": "string_value"
}
`;

    try {
      const text = await this.generateContentWithFallback(prompt);
      const parsed = JSON.parse(text);
      return parsed.answer || '';
    } catch (error: any) {
      console.error('[AITailorService Question Error]:', error.message);
      if (options && options.length > 0) return options[0];
      return 'Yes';
    }
  }
}
