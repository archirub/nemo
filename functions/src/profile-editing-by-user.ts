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
import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";
import { sanitizeData } from "./supporting-functions/data-validation/main";

export const profileEditingByUser = functions
  .region("europe-west2")
  .https.onCall(
    async (
      requestData: profileEditingByUserRequest,
      context
    ): Promise<successResponse> => {
      runWeakUserIdentityCheck(context);

      const uid = context?.auth?.uid as string;

      const sanitizedRequest = sanitizeData(
        "profileEditingByUser",
        requestData
      ) as profileEditingByUserRequest;

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
        const profileSnapshot = await profileRef.get();
        if (!profileSnapshot.exists) throw new Error();

        const currentProfile = profileSnapshot.data() as profileFromDatabase;

        const batch = admin.firestore().batch();

        batch.update(profileRef, sanitizedRequest);

        mdUpdateNeeded = matchDataUpdateNeeded(
          sanitizedRequest.data,
          currentProfile,
          propertiesInMatchData
        );

        if (mdUpdateNeeded) {
          propertiesInMatchData.forEach((prop) => {
            matchDataUpdateData["searchFeatures." + prop] =
              sanitizedRequest[prop] ?? null;
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
            JSON.stringify(sanitizedRequest) +
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
