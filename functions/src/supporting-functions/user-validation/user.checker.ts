import {
  additionalEmailsAllowedDocument,
  universitiesAllowedDocument,
} from "../../../../src/app/shared/interfaces/universities.model";
import { https, logger } from "firebase-functions";
import { firestore } from "firebase-admin";
import { emailIsAllowed } from "../../account-management";

export async function runStrongUserIdentityCheck(context: https.CallableContext) {
  // checking user's identity
  const additionalEmailsAllowed = (
    (
      await firestore().collection("admin").doc("additionalEmailsAllowed").get()
    ).data() as additionalEmailsAllowedDocument
  ).list;

  const universitiesAllowed = (
    (
      await firestore().collection("admin").doc("universitiesAllowed").get()
    ).data() as universitiesAllowedDocument
  ).list;
  const universityDomains = universitiesAllowed.map((info) => info.emailDomain);

  const identityCheck = await strongUserIdentityCheck(context);

  if (!identityCheck.isValid)
    throw new https.HttpsError(
      identityCheck?.reason ?? "unknown",
      "User is not authorized."
    );
}

export function runWeakUserIdentityCheck(context: https.CallableContext) {
  const identityCheck = weakUserIdentityCheck(context);

  if (!identityCheck.isValid)
    throw new https.HttpsError(
      identityCheck?.reason ?? "unknown",
      "User is not authorized."
    );
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
  const isAllowed = await checkEmailIsAllowed(emailToCheck);
  if (!isAllowed) logger.info("error was email was not allowed");

  if (!isAllowed) return { isValid: false, reason: "permission-denied" };

  return { isValid: true };
}

async function checkEmailIsAllowed(emailToCheck: string): Promise<boolean> {
  const additionalEmailsAllowed = (
    (
      await firestore().collection("admin").doc("additionalEmailsAllowed").get()
    ).data() as additionalEmailsAllowedDocument
  ).list;

  const universitiesAllowed = (
    (
      await firestore().collection("admin").doc("universitiesAllowed").get()
    ).data() as universitiesAllowedDocument
  ).list;

  const universityDomains = universitiesAllowed.map((info) => info.emailDomain);

  return emailIsAllowed(emailToCheck, universityDomains, additionalEmailsAllowed);
}
