import {
  deleteAccountRequest,
  successResponse,
} from "../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const deleteAccount = functions
  .region("europe-west2")
  .https.onCall(async (data: deleteAccountRequest, context): Promise<successResponse> => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User not authenticated.");

    const uid: string = context.auth.uid;

    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const chatDocs = await transaction.get(
          admin.firestore().collection("chats").where("uids", "array-contains", uid)
        );

        chatDocs.forEach((d) => transaction.delete(d.ref));

        const matchDataRef = admin.firestore().collection("matchData").doc(uid);
        const profileRef = admin.firestore().collection("profiles").doc(uid);

        transaction.delete(matchDataRef);
        transaction.delete(profileRef);
      });
    } catch (e) {
      return { successful: false, message: "documents deleting failed. Error: " + e };
    }

    try {
      await admin.auth().deleteUser(uid);
    } catch (e) {
      return {
        successful: false,
        message:
          "auth account deleting failed (but documents successfully deleted). Error: " +
          e,
      };
    }

    return { successful: true };
  });
