export interface AnswerOption {
  id: string;
  text: string;
}

export enum QuestionType {
  MultipleChoice = 'MULTIPLE_CHOICE',
  TrueFalse = 'TRUE_FALSE',
  Ordering = 'ORDERING',
}

interface BaseQuestion {
  id: string;
  time: number;
  questionText: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: QuestionType.MultipleChoice;
  options: AnswerOption[];
  correctAnswerId: string | null;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: QuestionType.TrueFalse;
  correctAnswerId: 'true' | 'false' | null;
}

export interface OrderingQuestion extends BaseQuestion {
  type: QuestionType.Ordering;
  items: AnswerOption[]; // Items in correct order
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | OrderingQuestion;
