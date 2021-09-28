import {
  chatDeletionByUserRequest,
  chatFromDatabase,
} from "./../../src/app/shared/interfaces/index";
// eslint-disable-next-line import/no-extraneous-dependencies
import { isEqual } from "lodash";

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";
import { sanitizeData } from "./supporting-functions/data-validation/main";

export const chatDeletionByUser = functions
  .region("europe-west2")
  .https.onCall(
    async (requestData: chatDeletionByUserRequest, context): Promise<void> => {
      runWeakUserIdentityCheck(context);

      const uid = context?.auth?.uid as string;

      const sanitizedRequest = sanitizeData(
        "chatDeletionByUser",
        requestData
      ) as chatDeletionByUserRequest;

      const chatRef = admin.firestore().collection("chats").doc(sanitizedRequest.chatID);
      const msgCollectionRef = admin
        .firestore()
        .collection("chats")
        .doc(sanitizedRequest.chatID)
        .collection("messages");

      const chatSnapshot = await chatRef.get();
      if (!chatSnapshot.exists)
        throw new functions.https.HttpsError(
          "not-found",
          "No chat corresponds to the id provided."
        );

      const batch = admin.firestore().batch();

      const messageRefs = await msgCollectionRef.listDocuments();

      batch.delete(chatRef);

      messageRefs.forEach((ref) => batch.delete(ref));

      await batch.commit();
    }
  );
