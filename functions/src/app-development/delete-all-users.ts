import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const deleteAllUsers = functions
  .region("europe-west2")
  .https.onCall(async (data, context): Promise<{ succesful: boolean }> => {
    const firebase_config =
      process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG);
    const projectId = firebase_config?.projectId;

    if (!projectId) return { succesful: false };

    if (projectId !== "nemo-dev-1b0bc") {
      functions.logger.error(
        "An attempt was made to delete all users from project with projectId" + projectId
      );
      return { succesful: false };
    }

    try {
      const uids = (await admin.auth().listUsers()).users.map((u) => u.uid);
      await admin.auth().deleteUsers(uids);
    } catch (e) {
      functions.logger.error("An error occured; firebase error msg: " + e);
      return { succesful: false };
    }
    return { succesful: true };
  });
