import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { config } from '../../config';
import { IAIProvider } from './ai.provider.interface';

export class GeminiProvider implements IAIProvider {
  private genAI: GoogleGenerativeAI;
  private candidateModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }

  public async generateContent(prompt: string): Promise<string> {
    const apiKey = config.geminiApiKey.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in environment configuration.');
    }

    const isOAuthAuthKey = apiKey.startsWith('AQ.');

    // Method 1: OAuth Bearer Token header fallback
    if (isOAuthAuthKey) {
      for (const modelName of this.candidateModels) {
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
          // Attempt next candidate model
        }
      }
    }

    // Method 2: Official Google Generative AI SDK
    for (const modelName of this.candidateModels) {
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
        // Attempt next model
      }
    }

    // Method 3: Standard REST API key parameter fallback
    for (const modelName of this.candidateModels) {
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
        // Attempt next REST model
      }
    }

    throw new Error('All Gemini API connection methods failed. Please check your API key in Google AI Studio.');
  }
}
