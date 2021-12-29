import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";
import { sanitizeData } from "./supporting-functions/data-validation/main";
import { notificationsDocument } from "../../src/app/shared/interfaces/profile.model";

export const testNotification = functions
  .region("europe-west2")
  .https.onCall(async (request, context): Promise<void> => {
    // const followerUid = context.params.followerUid;
    // const followedUid = context.params.followedUid;

    const uid = context?.auth?.uid;

    const deviceTokensRequest = await admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .collection("private")
      .doc("notifications")
      .get();

    const tokens = (deviceTokensRequest.data() as notificationsDocument).tokens;

    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: "Test notification!",
        body: `This worked let's fucking go`,
      },
    };

    const options: admin.messaging.MessagingOptions = {
      collapseKey: "new_message",
    };

    const response = await admin.messaging().sendToDevice(tokens, payload, options);

    // If un-follow we exit the function.
    // if (!change.after.val()) {
    //   return functions.logger.log("User ", followerUid, "un-followed user", followedUid);
    // }
    // functions.logger.log(
    //   "We have a new follower UID:",
    //   followerUid,
    //   "for user:",
    //   followedUid
    // );

    // Get the list of device notification tokens.
    // const getDeviceTokensPromise = admin
    //   .database()
    //   .ref(`/users/${followedUid}/notificationTokens`)
    //   .once("value");

    // Get the follower profile.
    // const getFollowerProfilePromise = admin.auth().getUser(followerUid);

    // // The snapshot to the user's tokens.
    // let tokensSnapshot;

    // The array containing all the user's tokens.
    // let tokens;

    // const results = await Promise.all([
    //   getDeviceTokensPromise,
    //   getFollowerProfilePromise,
    // ]);
    // tokensSnapshot = results[0];
    // const follower = results[1];

    // // Check if there are any device tokens.
    // if (!tokensSnapshot.hasChildren()) {
    //   return functions.logger.log("There are no notification tokens to send to.");
    // }
    // functions.logger.log(
    //   "There are",
    //   tokensSnapshot.numChildren(),
    //   "tokens to send notifications to."
    // );
    // functions.logger.log("Fetched follower profile", follower);

    // Notification details.
    // const payload = {
    //   notification: {
    //     title: "You have a new follower!",
    //     body: `${follower.displayName} is now following you.`,
    //     icon: follower.photoURL,
    //   },
    // };

    // Listing all tokens as an array.
    // tokens = Object.keys(tokensSnapshot.val());
    // // Send notifications to all tokens.
    // const response = await admin.messaging().sendToDevice(tokens, payload);
    // For each message check if there was an error.

    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        functions.logger.error("Failure sending notification to", tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        // if (
        //   error.code === "messaging/invalid-registration-token" ||
        //   error.code === "messaging/registration-token-not-registered"
        // ) {
        //   tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        // }
      }
    });
    // return Promise.all(tokensToRemove);
  });
