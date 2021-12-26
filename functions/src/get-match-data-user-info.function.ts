import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  getMatchDataUserInfoRequest,
  getMatchDataUserInfoResponse,
  mdMainFromDatabase,
} from "../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";
import { notFoundDocumentError } from "./supporting-functions/error-handling/generic-errors";

export const getMatchDataUserInfo = functions
  .region("europe-west2")
  .https.onCall(
    async (
      requestData: getMatchDataUserInfoRequest,
      context
    ): Promise<getMatchDataUserInfoResponse> => {
      runWeakUserIdentityCheck(context);

      const uid = context?.auth?.uid as string;

      const snapshot = await admin.firestore().collection("matchData").doc(uid).get();

      if (!snapshot.exists) notFoundDocumentError("matchData", snapshot.id, uid);

      const data = snapshot.data() as mdMainFromDatabase;

      const gender = data.gender;
      const sexualPreference = data.sexualPreference;
      const swipeMode = data.swipeMode;

      return { gender, sexualPreference, swipeMode };
    }
  );
