import "server-only";

/** RFC 6749 §5.2 token endpoint errors, plus RFC 8707's invalid_target. */
export type TokenErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "invalid_target";

/** A refusal the token endpoint returns as `{ error, error_description }`. */
export class OAuthTokenError extends Error {
  constructor(
    readonly code: TokenErrorCode,
    description: string
  ) {
    super(description);
  }
}

/** RFC 7591 §3.2.2 registration errors. */
export class ClientRegistrationError extends Error {
  constructor(
    readonly code: "invalid_redirect_uri" | "invalid_client_metadata",
    description: string
  ) {
    super(description);
  }
}
