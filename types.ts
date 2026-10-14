
export interface Character {
  id: string;
  name: string;
  role: string;
  personality: string;
  pastPain: string;      // Nỗi đau quá khứ
  currentDesire: string; // Mong muốn hiện tại
  internalConflict: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary: string;
  emotionalTone: string;
}

export type StoryStatus = 'in_progress' | 'completed';

export interface StoryProject {
  id: string;
  title: string;
  premise: string;
  setting: string;
  characters: Character[];
  outline: string[];
  chapters: Chapter[];
  createdAt: number;
  status?: StoryStatus;
  updatedAt?: number;
}

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  CHARACTERS = 'CHARACTERS',
  OUTLINE = 'OUTLINE',
  SETTINGS = 'SETTINGS'
}
