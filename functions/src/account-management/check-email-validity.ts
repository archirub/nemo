import {
  additionalEmailsAllowedDocument,
  checkEmailValidityRequest,
  successResponse,
  universitiesAllowedDocument,
} from "../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sanitizeData } from "../supporting-functions/data-validation/main";

export const checkEmailValidity = functions
  .region("europe-west2")
  .https.onCall(
    async (request: checkEmailValidityRequest, context): Promise<successResponse> => {
      const sanitizedRequest = sanitizeData(
        "checkEmailValidity",
        request
      ) as checkEmailValidityRequest;

      const emailToCheck = sanitizedRequest.email;

      try {
        const additionalEmailsAllowed = (
          (
            await admin
              .firestore()
              .collection("admin")
              .doc("additionalEmailsAllowed")
              .get()
          ).data() as additionalEmailsAllowedDocument
        ).list;

        const universitiesAllowed = (
          (
            await admin.firestore().collection("admin").doc("universitiesAllowed").get()
          ).data() as universitiesAllowedDocument
        ).list;

        const universityDomains = universitiesAllowed.map((info) => info.emailDomain);

        const isAllowed = emailIsAllowed(
          emailToCheck,
          universityDomains,
          additionalEmailsAllowed
        );

        if (!isAllowed)
          return { successful: false, message: "This email is not allowed." };

        return { successful: true };
      } catch (e) {
        return { successful: false, message: String(e) };
      }
    }
  );

export const emailIsAllowed = (
  emailToCheck: string,
  universityDomains: string[],
  additionalEmailsAllowed: string[]
): boolean => {
  const simpleEmailRegEx = new RegExp(/^[^\s@]+@[^\s@]+.[^\s@]+$/);

  const isEmail = simpleEmailRegEx.test(emailToCheck);

  const isAllowedEmail = additionalEmailsAllowed.includes(emailToCheck);

  const isFromAllowedDomain =
    universityDomains.length === 0
      ? false
      : universityDomains
          .map((domain) => emailToCheck.endsWith(domain))
          .reduce((x, y) => {
            if (x === true) return x;
            return y;
          });

  if (!isEmail) return false;

  if (!isAllowedEmail && !isFromAllowedDomain) return false;

  return true;
};
