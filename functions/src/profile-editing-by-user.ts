import {
  editableProfileFields,
  profileEditingByUserRequest,
  profileFromDatabase,
  successResponse,
} from "./../../src/app/shared/interfaces/index";
// eslint-disable-next-line import/no-extraneous-dependencies
import { isEqual } from "lodash";

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const profileEditingByUser = functions
  .region("europe-west2")
  .https.onCall(
    async (
      requestData: profileEditingByUserRequest,
      context
    ): Promise<successResponse> => {
      if (!context.auth)
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User not authenticated."
        );

      const uid: string = context.auth.uid;

      // done this way so that Typescript will let me know in case "editableProfileFields"
      // changes and hence these aren't all the properties anymore
      const sanitizedEditableProfileMap: editableProfileFields = {
        biography: null,
        course: null,
        areaOfStudy: null,
        society: null,
        societyCategory: null,
        interests: null,
        questions: null,
      };

      (
        Object.keys(sanitizedEditableProfileMap) as (keyof editableProfileFields)[]
      ).forEach((prop) => {
        if (typeof requestData.data[prop] === "undefined") {
          delete sanitizedEditableProfileMap[prop];
        } else {
          sanitizedEditableProfileMap[prop] = requestData.data[prop] as any;
        }
      });

      const profileRef = admin.firestore().collection("profiles").doc(uid);
      const matchDataRef = admin
        .firestore()
        .collection("matchData")
        .doc(uid)
        .collection("pickingData")
        .doc("dating");
      const propertiesInMatchData: (keyof editableProfileFields)[] = [
        "areaOfStudy",
        "interests",
        "societyCategory",
      ];
      let mdUpdateNeeded: boolean = false;

      const matchDataUpdateData = {};
      try {
        const currentProfile = (await profileRef.get()).data() as profileFromDatabase;

        const batch = admin.firestore().batch();

        batch.update(profileRef, sanitizedEditableProfileMap);

        mdUpdateNeeded = matchDataUpdateNeeded(
          sanitizedEditableProfileMap,
          currentProfile,
          propertiesInMatchData
        );

        if (mdUpdateNeeded) {
          propertiesInMatchData.forEach((prop) => {
            if (prop && sanitizedEditableProfileMap[prop]) {
              matchDataUpdateData["searchFeatures." + prop] =
                sanitizedEditableProfileMap[prop];
            }
          });

          batch.update(matchDataRef, matchDataUpdateData);
        }

        await batch.commit();
        return { successful: true };
      } catch (e) {
        return {
          successful: false,
          message:
            "error message: " +
            e +
            " editableProfileMap:" +
            JSON.stringify(sanitizedEditableProfileMap) +
            " matchDataUpdateData:" +
            JSON.stringify(matchDataUpdateData) +
            " updateNeeded:" +
            mdUpdateNeeded,
        };
      }
    }
  );

function matchDataUpdateNeeded(
  newData: editableProfileFields,
  currentProfile: profileFromDatabase,
  propertiesInMatchData: (keyof editableProfileFields)[]
): boolean {
  let changeNeeded = false;

  propertiesInMatchData.forEach((prop) => {
    if (
      Array.isArray(currentProfile[prop]) &&
      !isEqual((currentProfile[prop] as any[]).sort(), (newData[prop] as any[]).sort())
    ) {
      changeNeeded = true;
    } else if (!isEqual(currentProfile[prop], newData[prop])) {
      changeNeeded = true;
    }
  });

  return changeNeeded;
}
