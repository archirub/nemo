import {
  chatDeletionByUserRequest,
  chatFromDatabase,
  mdMainFromDatabase,
} from "./../../src/app/shared/interfaces/index";

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";
import { sanitizeData } from "./supporting-functions/data-validation/main";
import {
  inexistentDocumentError,
  invalidDocumentError,
} from "./supporting-functions/error-handling/generic-errors";

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

      const batch = admin.firestore().batch();

      const matchDataRef = admin.firestore().collection("matchData").doc(uid);
      const chatRef = admin.firestore().collection("chats").doc(sanitizedRequest.chatID);
      const msgCollectionRef = admin
        .firestore()
        .collection("chats")
        .doc(sanitizedRequest.chatID)
        .collection("messages");

      const [matchDataSnapshot, chatSnapshot, messageRefs] = await Promise.all([
        matchDataRef.get(),
        chatRef.get(),
        msgCollectionRef.listDocuments(),
      ]);

      const recipientuid = (chatSnapshot.data() as chatFromDatabase)?.uids?.filter(
        (u) => u !== uid
      )[0];

      if (!chatSnapshot.exists) inexistentDocumentError("chat", chatSnapshot.id, uid);
      if (!matchDataSnapshot.exists)
        inexistentDocumentError("matchData", matchDataSnapshot.id, uid);
      if (!recipientuid)
        invalidDocumentError(
          "chat",
          "recipientuid",
          chatSnapshot.id,
          uid,
          "This is the uid which isn't the caller's in the uids field"
        );

      deleteMatch(
        batch,
        matchDataSnapshot as FirebaseFirestore.DocumentSnapshot<mdMainFromDatabase>,
        recipientuid
      );
      batch.delete(chatRef);
      messageRefs.forEach((ref) => batch.delete(ref));

      await batch.commit();
    }
  );

function deleteMatch(
  batch: FirebaseFirestore.WriteBatch,
  matchDataSnapshot: FirebaseFirestore.DocumentSnapshot<mdMainFromDatabase>,
  recipientuid: string
) {
  const matchData = matchDataSnapshot.data();
  if (matchData?.matchedUsers[recipientuid]?.exists) {
    delete matchData.matchedUsers[recipientuid];
    batch.update(matchDataSnapshot.ref, { matchedUsers: matchData.matchedUsers });
  }
}
