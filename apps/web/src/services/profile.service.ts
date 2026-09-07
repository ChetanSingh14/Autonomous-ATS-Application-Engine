import { ApiClient } from './api.client';

export interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  targetRoles: string[];
  skills: string[];
  yearsExperience: number;
  summary: string;
  experience: any[];
  projects: any[];
  education: any[];
}

export class FrontendProfileService {
  public static async getProfile(): Promise<UserProfile | null> {
    const res = await ApiClient.get<{ profile: UserProfile }>('/profile');
    return res?.profile || null;
  }

  public static async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const res = await ApiClient.put<{ profile: UserProfile }>('/profile', profile);
    return res?.profile || null;
  }

  public static async parseResume(data: { resumeText?: string; resumePdfBase64?: string }): Promise<UserProfile | null> {
    const res = await ApiClient.post<{ success: boolean; profile: UserProfile }>('/profile/parse-resume', data);
    return res?.profile || null;
  }
}
