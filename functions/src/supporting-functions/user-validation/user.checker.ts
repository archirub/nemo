import {
  additionalEmailsAllowedDocument,
  universitiesAllowedDocument,
} from "../../../../src/app/shared/interfaces/universities.model";
import { https, logger } from "firebase-functions";
import { firestore } from "firebase-admin";

import { emailIsAllowed } from "../../account-management";
import { notFoundDocumentError } from "../error-handling/generic-errors";

/**
 * Checks for:
 * - Authenticated
 * - Email verified
 * - Email from an allowed university or in additionalAllowedEmails
 */
export async function runStrongUserIdentityCheck(context: https.CallableContext) {
  const identityCheck = await strongUserIdentityCheck(context);

  if (!identityCheck.isValid)
    throw new https.HttpsError(
      identityCheck?.reason ?? "unknown",
      "User is not authorized."
    );
}

/**
 * Checks for:
 * - Authenticated
 * - Email verified
 */
export function runWeakUserIdentityCheck(context: https.CallableContext) {
  const identityCheck = weakUserIdentityCheck(context);

  if (!identityCheck.isValid)
    throw new https.HttpsError(
      identityCheck?.reason ?? "unknown",
      "User is not authorized."
    );
}

export function runAdminUserIdentityCheck(context: https.CallableContext) {
  const identityCheck = adminUserIdentityCheck(context);

  if (!identityCheck.isValid)
    throw new https.HttpsError(
      identityCheck?.reason ?? "unknown",
      "User is not authorized."
    );
}

function adminUserIdentityCheck(context: https.CallableContext): {
  isValid: boolean;
  reason?: https.FunctionsErrorCode;
} {
  if (!context?.auth) return { isValid: false, reason: "unauthenticated" };

  if (!["archibald.ruban@gmail.com"].includes(context?.auth?.token?.email))
    return { isValid: false, reason: "permission-denied" };

  return { isValid: true };
}

function weakUserIdentityCheck(context: https.CallableContext): {
  isValid: boolean;
  reason?: https.FunctionsErrorCode;
} {
  if (!context?.auth) return { isValid: false, reason: "unauthenticated" };

  if (!context?.auth?.token?.email || !context?.auth?.token?.email_verified)
    return { isValid: false, reason: "permission-denied" };

  return { isValid: true };
}

async function strongUserIdentityCheck(context: https.CallableContext): Promise<{
  isValid: boolean;
  reason?: https.FunctionsErrorCode;
}> {
  const weakCheck = weakUserIdentityCheck(context);
  if (!weakCheck.isValid) logger.info("error was weak check");

  if (!weakCheck.isValid) return weakCheck;

  const emailToCheck = context?.auth?.token?.email as string;
  const isAllowed = await checkEmailIsAllowed(emailToCheck, context?.auth?.uid);
  if (!isAllowed) logger.info("Email wasn't allowed:", emailToCheck);

  if (!isAllowed) return { isValid: false, reason: "permission-denied" };

  return { isValid: true };
}

async function checkEmailIsAllowed(emailToCheck: string, uid: string): Promise<boolean> {
  const AEA_request = firestore()
    .collection("admin")
    .doc("additionalEmailsAllowed")
    .get();
  const UA_Request = firestore().collection("general").doc("universitiesAllowed").get();

  const [AEA_doc, UA_doc] = await Promise.all([AEA_request, UA_Request]);

  if (!AEA_doc.exists) notFoundDocumentError("admin", "additionalEmailsAllowed", uid);
  if (!UA_doc.exists) notFoundDocumentError("general", "universitiesAllowed", uid);

  const additionalEmailsAllowed = (AEA_doc.data() as additionalEmailsAllowedDocument)
    .list;
  const universitiesAllowed = (UA_doc.data() as universitiesAllowedDocument).list;

  const universityDomains = universitiesAllowed.map((info) => info.emailDomain);

  return emailIsAllowed(emailToCheck, universityDomains, additionalEmailsAllowed);
}
