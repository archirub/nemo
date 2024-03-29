import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  piStorage,
  updateGenderSexPrefRequest,
} from "../../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../supporting-functions/data-validation/main";

export const updateGenderSexPref = functions
  .region("europe-west2")
  .https.onCall(async (request: updateGenderSexPrefRequest, context): Promise<void> => {
    runWeakUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

    const sanitizedRequest = sanitizeData(
      "updateGenderSexPref",
      request
    ) as updateGenderSexPrefRequest;

    const propertyName = sanitizedRequest.name;
    const propertyValue = sanitizedRequest.value;

    // const uid = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";
    // updateGenderSexPref({uid: "oY6HiUHmUvcKbFQQnb88t3U4Zew1", name: "sexualPreference", value: ["female"]})

    const matchDataRef = admin.firestore().collection("matchData").doc(uid);
    const pistorage = (await admin
      .firestore()
      .collection("piStorage")
      .where("uids", "array-contains", uid)
      .limit(1)
      .get()) as FirebaseFirestore.QuerySnapshot<piStorage>;

    if (pistorage.empty)
      throw new functions.https.HttpsError(
        "aborted",
        `user seems to be in no piStorage doc. id: ${uid}`
      );

    const batch = admin.firestore().batch();

    batch.update(matchDataRef, {
      [`${propertyName}`]: propertyValue,
    });

    batch.update(pistorage.docs[0].ref, {
      [`${uid}.${propertyName}`]: propertyValue,
    });

    await batch.commit();
  });

/**
 * Checks whether the two arrays provided contain the same elements in order
 * @Returns boolean
 */
function sameArrays(array1: any[], array2: any[]): boolean {
  return array1.join(",") === array2.join(",");
}
