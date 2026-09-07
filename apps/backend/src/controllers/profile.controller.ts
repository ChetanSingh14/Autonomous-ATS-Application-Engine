import { Request, Response, NextFunction } from 'express';
import pdfParse from 'pdf-parse';
import { prisma } from '../lib/prisma';
import { AITailorService } from '../services/ai-tailor.service';

export class ProfileController {
  private aiService: AITailorService;

  constructor() {
    this.aiService = new AITailorService();
  }

  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await prisma.userProfile.findFirst();
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await prisma.userProfile.findFirst();
      if (!profile) {
        const created = await prisma.userProfile.create({ data: req.body });
        res.status(200).json({ profile: created });
        return;
      }

      const updated = await prisma.userProfile.update({
        where: { id: profile.id },
        data: req.body,
      });

      res.status(200).json({ profile: updated });
    } catch (error) {
      next(error);
    }
  };

  public parseResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { resumeText, resumePdfBase64 } = req.body;
      let extractedText = resumeText || '';

      if (resumePdfBase64) {
        try {
          const buffer = Buffer.from(resumePdfBase64, 'base64');
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text || '';
        } catch (err: any) {
          res.status(400).json({ error: `Could not parse PDF file: ${err.message}` });
          return;
        }
      }

      if (!extractedText.trim()) {
        res.status(400).json({ error: 'No resume text or PDF content provided' });
        return;
      }

      const parsedData = await this.aiService.parseRawResumeText(extractedText);

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

      res.status(200).json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  };
}
