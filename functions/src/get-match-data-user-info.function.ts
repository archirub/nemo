import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  getMatchDataUserInfoRequest,
  getMatchDataUserInfoResponse,
  mdFromDatabase,
} from "../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";

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

      if (!snapshot.exists)
        throw new functions.https.HttpsError(
          "unavailable",
          "The Firestore document requested doesn't exist."
        );

      const data = snapshot.data() as mdFromDatabase;

      const gender = data.gender;
      const sexualPreference = data.sexualPreference;
      const swipeMode = data.swipeMode;

      return { gender, sexualPreference, swipeMode };
    }
  );
