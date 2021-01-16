import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  getMatchDataUserInfoRequest,
  getMatchDataUserInfoResponse,
  matchDataFromDatabase,
} from "../../src/app/shared/interfaces/index";

export const getMatchDataUserInfo = functions
  .region("europe-west2")
  .https.onCall(
    async (
      requestData: getMatchDataUserInfoRequest,
      context
    ): Promise<getMatchDataUserInfoResponse> => {
      if (!context.auth)
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User not authenticated."
        );

      const uid: string = context.auth.uid;

      const snapshot = await admin
        .firestore()
        .collection("matchData")
        .doc(uid)
        .get();

      if (!snapshot.exists)
        throw new functions.https.HttpsError(
          "unavailable",
          "The Firestore document requested doesn't exist."
        );

      const data = snapshot.data() as matchDataFromDatabase;

      const gender = data.gender;
      const sexualPreference = data.sexualPreference;
      const swipeMode = data.swipeMode;
      const showProfile = data.showProfile;

      return { gender, sexualPreference, swipeMode, showProfile };
    }
  );
