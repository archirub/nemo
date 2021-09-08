import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const deleteAllData = functions
  .region("europe-west2")
  .https.onCall(async (data, context): Promise<{ succesful: boolean }> => {
    const firebase_config =
      process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG);
    const projectId = firebase_config?.projectId;

    if (!projectId) return { succesful: false };

    if (projectId !== "nemo-dev-1b0bc") {
      functions.logger.error(
        "An attempt was made to delete all data from project with projectId" + projectId
      );
      return { succesful: false };
    }
    const flatten = (ary) =>
      ary.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

    try {
      const collections = await admin.firestore().listCollections();

      const rootDocuments = flatten(
        await Promise.all(collections.map(async (c) => c.listDocuments()))
      ) as FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[];

      const subCollections = flatten(
        await Promise.all(rootDocuments.map((doc) => doc.listCollections()))
      ) as FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>[];

      const docsFromSubcollections = flatten(
        await Promise.all(subCollections.map(async (c) => c.listDocuments()))
      ) as FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[];

      await Promise.all([
        ...rootDocuments.map((d) => d.delete()),
        ...docsFromSubcollections.map((d) => d.delete()),
      ]);
    } catch (e) {
      functions.logger.error("An error occured; firebase error msg: " + e);
      return { succesful: false };
    }
    return { succesful: true };
  });
