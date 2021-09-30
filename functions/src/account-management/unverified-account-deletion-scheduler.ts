import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const unverifiedAccountDeletionScheduler = functions
  .region("europe-west2")
  .pubsub.schedule("every 2 hours")
  .onRun(async (context) => {
    // maximum amount of time that we'll allow an account to be created without being email verified
    const UNVERIFIED_THRESHOLD_TIME = 60 * 60 * 1000; // one hour in ms
    const now = new Date();

    const reachedThreshold = (
      accountCreationTime: number,
      currentTime: number
    ): boolean => {
      if (!accountCreationTime) return false;
      const timeElapsed = currentTime - accountCreationTime;
      return timeElapsed > UNVERIFIED_THRESHOLD_TIME;
    };

    const allUsers = (await admin.auth().listUsers()).users;

    const usersToDelete = allUsers
      .filter(
        (user) =>
          !user?.emailVerified &&
          reachedThreshold(Date.parse(user?.metadata?.creationTime), now.getTime())
      )
      .map((user) => user.uid);

    // deleteUsers throws an error if we attempt to delete more than 1000 users
    const batchSize = 500;

    while (usersToDelete.length > 0) {
      const usersInBatch = usersToDelete.splice(0, batchSize);
      await admin.auth().deleteUsers(usersInBatch);
    }
  });
