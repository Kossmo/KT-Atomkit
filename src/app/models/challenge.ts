export interface ChallengeHint {
  label: string;
  content: string;
}

export interface ChallengeDef {
  id: string;
  targetSmiles: string;
  targetCid: number | null;
  name: string;
  formula: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hints: ChallengeHint[];
}

export interface ChapterDef {
  id: string;
  title: string;
  icon: string;
  challenges: ChallengeDef[];
}

export interface DailyConstraint {
  smarts: string;
  label: string;
}

export interface DailyChallengeDef {
  theme: string;
  description: string;
  constraints: DailyConstraint[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}
