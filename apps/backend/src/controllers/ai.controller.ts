import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AITailorService } from '../services/ai-tailor.service';

export class AIController {
  private aiService: AITailorService;

  constructor() {
    this.aiService = new AITailorService();
  }

  public answerQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, fieldType, options } = req.body;

      if (!question) {
        res.status(400).json({ error: 'Question field is required' });
        return;
      }

      const profile = await prisma.userProfile.findFirst();
      const answer = await this.aiService.answerDynamicQuestion(
        question,
        fieldType || 'text',
        options,
        profile
      );

      res.status(200).json({ answer });
    } catch (error: any) {
      console.error('[AIController Error] /ai/answer-question:', error.message);
      const options = req.body?.options;
      res.status(500).json({ answer: options && options.length > 0 ? options[0] : 'Yes' });
    }
  };
}
