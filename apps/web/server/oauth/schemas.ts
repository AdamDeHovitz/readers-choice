import "server-only";
import { z } from "zod";
import { isAllowedRedirectUri } from "@readers-choice/core/oauth";

/** Client metadata fields shared by registration and metadata documents. */

/** Names are shown on the consent screen: printable text only. */
export const clientName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[^\p{C}]+$/u, "client_name must be printable text");

export const redirectUris = z
  .array(
    z.string().refine(isAllowedRedirectUri, {
      message:
        "Redirect URIs must use HTTPS or a loopback address, with no fragment",
    })
  )
  .min(1)
  .max(10);
