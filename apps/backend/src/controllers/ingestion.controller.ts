import { Request, Response, NextFunction } from 'express';
import { IngestionService } from '../services/ingestion.service';

export class IngestionController {
  private ingestionService: IngestionService;

  constructor() {
    this.ingestionService = new IngestionService();
  }

  public triggerIngestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companySlug, platform } = req.body;
      let count = 0;

      if (companySlug) {
        if (platform === 'LEVER') {
          count = await this.ingestionService.fetchLeverBoard(companySlug);
        } else if (platform === 'ASHBY') {
          count = await this.ingestionService.fetchAshbyBoard(companySlug);
        } else {
          count = await this.ingestionService.fetchGreenhouseBoard(companySlug);
        }
      } else {
        const result = await this.ingestionService.triggerBatchIngestion();
        count = result.totalIngested;
      }

      res.status(200).json({ success: true, count });
    } catch (error) {
      next(error);
    }
  };
}
