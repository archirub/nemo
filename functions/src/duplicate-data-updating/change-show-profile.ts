import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  changeShowProfileRequest,
  successResponse,
  piStorage,
} from "../../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../supporting-functions/data-validation/main";

export const changeShowProfile = functions
  .region("europe-west2")
  .https.onCall(
    async (request: changeShowProfileRequest, context): Promise<successResponse> => {
      runWeakUserIdentityCheck(context);

      const uid = context?.auth?.uid as string;

      const sanitizedRequest = sanitizeData(
        "changeShowProfile",
        request
      ) as changeShowProfileRequest;

      const showProfile: boolean = sanitizedRequest.showProfile;

      if ([true, false].includes(showProfile)) {
        return { successful: false };
      }
      const pistorage = (await admin
        .firestore()
        .collection("piStorage")
        .where("uids", "array-contains", uid)
        .limit(1)
        .get()) as FirebaseFirestore.QuerySnapshot<piStorage>;

      const privateProfileRef = admin
        .firestore()
        .collection("profiles")
        .doc(uid)
        .collection("private")
        .doc("private");

      const batch = admin.firestore().batch();

      batch.update(privateProfileRef, {
        "settings.showProfile": showProfile,
      });

      if (pistorage.empty) {
        functions.logger.error(`user seems to be in no piStorage doc. id: ${uid}`);
        return { successful: false };
      }

      batch.update(pistorage.docs[0].ref, {
        [`${uid}.showProfile`]: showProfile,
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
