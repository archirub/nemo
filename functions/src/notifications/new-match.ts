import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import {
  chatFromDatabase,
  notificationsDocument,
} from "../../../src/app/shared/interfaces/index";

// FIXME - notification sent to both users, instead of only the person who didn't make the match
// This is because we don't have the uid of the user that made the match or vice-versa.
// So we are counting on the fact that, when this cloud function is triggered, the user
// making the match will still be on the app and hence will not receive the notification
// sent to him about the match he just made.

export const newMatchNotification = functions
  .region("europe-west2")
  .firestore.document("chats/{chatId}")
  .onCreate(async (snap, context) => {
    const data = snap.data() as chatFromDatabase;
    const tokenMap: { [uid: string]: string[] } = {};
    data.uids.forEach((uid) => (tokenMap[uid] = []));

    await Promise.all(
      data.uids.map(async (uid) => {
        const notifDocSnapshot = await admin
          .firestore()
          .collection("profiles")
          .doc(uid)
          .collection("private")
          .doc("notifications")
          .get();

        if (!notifDocSnapshot.exists) return;

        const tokens = (notifDocSnapshot.data() as notificationsDocument)?.tokens;

        if (!Array.isArray(tokens) || tokens.length == 0) return;

        tokenMap[uid] = tokens;
      })
    );

    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: `New Match!`,
        body: `Go to the app to start talking with them.`,
      },
    };
    const options: admin.messaging.MessagingOptions = {
      collapseKey: `new_match`,
    };

    const allTokens = Object.values(tokenMap).flat();

    const response = await admin.messaging().sendToDevice(allTokens, payload, options);

    const tokensToRemove: {
      [uid: string]: string[];
    } = {};
    Object.keys(tokenMap).forEach((uid) => (tokensToRemove[uid] = []));

    response.results.forEach((result, index) => {
      const error = result.error;

      if (error) {
        functions.logger.error(
          "Failure sending notification to",
          allTokens[index],
          error
        );
        // Cleanup the tokens who are not registered anymore.
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          Object.entries(tokenMap).forEach(([uid, tokens]) => {
            if (tokens.includes(allTokens[index])) {
              tokensToRemove[uid].push(allTokens[index]);
            }
          });
        }
      }
    });
    await Promise.all(
      Object.entries(tokensToRemove).map(async ([uid, tokens]) => {
        if (tokens.length == 0) return;

        const newTokensArray = tokens.filter((t) => !tokens.includes(t));

        await admin
          .firestore()
          .collection("profiles")
          .doc(uid)
          .collection("private")
          .doc("notifications")
          .update({ tokens: newTokensArray });
      })
    );
  });
