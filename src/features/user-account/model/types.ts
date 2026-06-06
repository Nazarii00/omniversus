export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BattlesHistoryItem {
  id: string;
  fighterA: string;
  fighterB: string;
  status: string;
  winner: string | null;
  createdAt: Date;
  completedAt: Date | null;
}
