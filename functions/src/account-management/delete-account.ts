import {
  additionalEmailsAllowedDocument,
  deleteAccountRequest,
  successResponse,
  universitiesAllowedDocument,
} from "../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { runStrongUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";

export const deleteAccount = functions
  .region("europe-west2")
  .https.onCall(async (data: deleteAccountRequest, context): Promise<successResponse> => {
    await runStrongUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

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
