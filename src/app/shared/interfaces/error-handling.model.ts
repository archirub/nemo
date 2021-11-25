export const UNAUTHENTICATED = "unauthenticated";
export const TEST = "test";

export const ERROR_NAMES = [UNAUTHENTICATED, TEST] as const;

export type ErrorName = typeof ERROR_NAMES[number];

export interface CustomError {
  header?: string;
  message?: string;
  buttons?: string[];
}
