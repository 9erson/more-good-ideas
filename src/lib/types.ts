export type Topic = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  ideaCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
