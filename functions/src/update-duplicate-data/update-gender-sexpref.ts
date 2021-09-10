import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  genderOptions,
  piStorage,
  sexualPreferenceOptions,
  successResponse,
  updateGenderSexPrefRequest,
} from "./../../../src/app/shared/interfaces/index";

export const updateGenderSexPref = functions
  .region("europe-west2")
  .https.onCall(
    async (data: updateGenderSexPrefRequest, context): Promise<successResponse> => {
      const uid = data.uid;
      const propertyName = data.name;
      const propertyValue = data.value;

      // const uid = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";
      // updateGenderSexPref({uid: "oY6HiUHmUvcKbFQQnb88t3U4Zew1", name: "sexualPreference", value: ["female"]})

      if (!["gender", "sexualPreference"].includes(propertyName)) {
        return { successful: false };
      }
      if (propertyName === "gender") {
        if (!["male", "female", "other"].includes(propertyValue as string)) {
          return { successful: false };
        }
      } else if (propertyName === "sexualPreference") {
        // Check if corresponding value is an array
        if (!Array.isArray(propertyValue)) {
          return { successful: false };
        }
        // check if property is one of these allowed arrays
        let found = false;
        for (const array of [["male"], ["female"], ["male", "female"]]) {
          if (sameArrays(array, propertyValue as string[])) {
            found = true;
            break;
          }
        }
        if (found === false) {
          return { successful: false };
        }
      }

      const matchDataRef = admin.firestore().collection("matchData").doc(uid);
      const pistorage = (await admin
        .firestore()
        .collection("piStorage")
        .where("uids", "array-contains", uid)
        .limit(1)
        .get()) as FirebaseFirestore.QuerySnapshot<piStorage>;

      if (pistorage.empty) {
        functions.logger.error(`user seems to be in no piStorage doc. id: ${uid}`);
        return { successful: false };
      }

      const batch = admin.firestore().batch();

      batch.update(matchDataRef, {
        [`${propertyName}`]: propertyValue,
      });

      batch.update(pistorage.docs[0].ref, {
        [`${uid}.${propertyName}`]: propertyValue,
      });

      try {
        await batch.commit();
        return { successful: true };
      } catch (e) {
        functions.logger.error(`Error for ${uid} : ${e}`);
        return { successful: false };
      }
    }
  );

/**
 * Checks whether the two arrays provided contain the same elements in order
 * @Returns boolean
 */
function sameArrays(array1: any[], array2: any[]): boolean {
  return array1.join(",") === array2.join(",");
}
