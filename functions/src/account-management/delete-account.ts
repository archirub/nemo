import {
  additionalEmailsAllowedDocument,
  deleteAccountRequest,
  universitiesAllowedDocument,
} from "../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { runStrongUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";

export const deleteAccount = functions
  .region("europe-west2")
  .https.onCall(async (data: deleteAccountRequest, context): Promise<void> => {
    await runStrongUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

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

    try {
      await admin.auth().deleteUser(uid);
    } catch (e) {
      throw new functions.https.HttpsError(
        "internal",
        `failed to delete account of user with uid ${uid} after
      succesful deletion of their data. Error given: ${e}`
      );
    }
  });
