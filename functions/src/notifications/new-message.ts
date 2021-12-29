import {
  notificationsDocument,
  profileFromDatabase,
} from "../../../src/app/shared/interfaces/profile.model";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { messageFromDatabase } from "../../../src/app/shared/interfaces/index";

export const newMessageNotification = functions
  .region("europe-west2")
  .firestore.document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const thresholdTime = 1 * 3600 * 1000; // 1 hour in milliseconds (arbitrarily chosen)

    const data = snap.data() as messageFromDatabase;
    const senderID = data.senderID;
    const receiverID = data.uids.filter((v) => v != senderID)[0];

    // just a safety measure (I don't really have a specific case in mind
    // where that would happen, but it seems like a legitimate and cheap check
    // that this is a normal message doc creation)
    const now = Date.now();
    const timeElapsed = Math.abs(now - data.time.toMillis());

    if (timeElapsed > thresholdTime) return;

    const notifDocSnapshot = await admin
      .firestore()
      .collection("profiles")
      .doc(receiverID)
      .collection("private")
      .doc("notifications")
      .get();

    if (!notifDocSnapshot.exists) return;

    const tokens = (notifDocSnapshot.data() as notificationsDocument)?.tokens;

    if (!Array.isArray(tokens) || tokens.length == 0) return;

    const profileSnapshot = await admin
      .firestore()
      .collection("profiles")
      .doc(senderID)
      .get();

    if (!profileSnapshot.exists) return;

    const senderFirstName = (profileSnapshot.data() as profileFromDatabase).firstName;

    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: `${senderFirstName}`,
        body: `New Message`,
      },
    };
    const options: admin.messaging.MessagingOptions = {
      collapseKey: `new_message_${senderID}`,
    };

    const response = await admin.messaging().sendToDevice(tokens, payload, options);

    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;

      if (error) {
        functions.logger.error("Failure sending notification to", tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length == 0) return;

    const newTokensArray = tokens.filter((t) => !tokensToRemove.includes(t));

    await notifDocSnapshot.ref.update({
      tokens: newTokensArray,
    });
  });
