export type ErrorCode =
  | "NOT_WHITELISTED"
  | "SIGNING_DISABLED"
  | "ZERO_FEE_RECIPIENT"
  | "INVALID_PARAMS"
  | "UNKNOWN_LAUNCH"
  | "REVERT";

export class PonsbotError extends Error {
  readonly code: ErrorCode;
  readonly revertName?: string;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, options?: { revertName?: string; details?: Record<string, unknown> }) {
    super(message);
    this.name = "PonsbotError";
    this.code = code;
    if (options?.revertName !== undefined) this.revertName = options.revertName;
    if (options?.details !== undefined) this.details = options.details;
  }
}

const REVERT_MAP: Record<string, ErrorCode> = {
  NotWhitelisted: "NOT_WHITELISTED",
  NotApprovedLauncher: "NOT_WHITELISTED",
  ZeroAddress: "ZERO_FEE_RECIPIENT",
};

export function codeFromRevertName(name: string): ErrorCode {
  return REVERT_MAP[name] ?? "REVERT";
}

export function errorEnvelope(error: unknown): {
  code: ErrorCode;
  message: string;
  revertName?: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof PonsbotError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.revertName !== undefined ? { revertName: error.revertName } : {}),
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }
  if (error instanceof Error) {
    return { code: "REVERT", message: error.message };
  }
  return { code: "REVERT", message: "Unknown error" };
}
