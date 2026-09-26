import { z } from "zod";

export class ActionError extends Error {
  code: string;
  constructor(params: { code: string; message?: string }) {
    super(params.message || params.code);
    this.code = params.code;
    this.name = "ActionError";
  }
}

export const defineAction = <T>(action: T): T => action;
export const isActionError = (err: unknown): err is ActionError =>
  err instanceof ActionError;

export { z };
