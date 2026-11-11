/**
 * An expected failure whose message is safe to show the user (not found,
 * not allowed, invalid input). Server actions return its message as-is; any
 * other thrown error is logged and replaced with a generic message.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
