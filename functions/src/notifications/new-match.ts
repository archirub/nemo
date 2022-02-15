import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import {
  chatFromDatabase,
  notificationsDocument,
  profileFromDatabase,
} from "../../../src/app/shared/interfaces/index";
import { notFoundDocumentError } from "../supporting-functions/error-handling/generic-errors";

export const newMatchNotification = functions
  .region("europe-west2")
  .firestore.document("chats/{chatId}")
  .onCreate(async (snap, context) => {
    const data = snap.data() as chatFromDatabase;
    const uidOfReceiver = data.uids.filter((uid) => uid !== data.uidOfMatchmaker)[0];

    const notifDocSnapshot = await admin
      .firestore()
      .collection("profiles")
      .doc(uidOfReceiver)
      .collection("private")
      .doc("notifications")
      .get();

    const matchmakerProfileSnapshot = await admin
      .firestore()
      .collection("profiles")
      .doc(data.uidOfMatchmaker)
      .get();

    if (!notifDocSnapshot.exists)
      return notFoundDocumentError(
        `profiles/${uidOfReceiver}/private`,
        "notifications",
        "onCreate"
      );
    if (!matchmakerProfileSnapshot.exists)
      return notFoundDocumentError(`profiles`, data.uidOfMatchmaker, "onCreate");

    const tokens = (notifDocSnapshot.data() as notificationsDocument)?.tokens;
    const matchmakerFirstName = (matchmakerProfileSnapshot.data() as profileFromDatabase)
      ?.firstName;

    if (!Array.isArray(tokens) || tokens.length == 0) return;

    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: !!matchmakerFirstName
          ? `You caught ${matchmakerFirstName}!`
          : `New catch!`,
        body: `Head back to Nemo to find out more`,
      },
    };
    const options: admin.messaging.MessagingOptions = {
      collapseKey: `new_catch`,
    };

    const response = await admin.messaging().sendToDevice(tokens, payload, options);

    const tokensToRemove: string[] = [];
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

    if (tokensToRemove.length > 0) {
      await admin
        .firestore()
        .collection("profiles")
        .doc(uidOfReceiver)
        .collection("private")
        .doc("notifications")
        .update({ tokens: admin.firestore.FieldValue.arrayRemove(tokensToRemove) });
    }
  });
