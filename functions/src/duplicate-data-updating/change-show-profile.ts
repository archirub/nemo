import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  changeShowProfileRequest,
  piStorage,
} from "../../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../supporting-functions/data-validation/main";

export const changeShowProfile = functions
  .region("europe-west2")
  .https.onCall(async (request: changeShowProfileRequest, context): Promise<void> => {
    runWeakUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

    const sanitizedRequest = sanitizeData(
      "changeShowProfile",
      request
    ) as changeShowProfileRequest;

    const showProfile: boolean = sanitizedRequest.showProfile;

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
      // since pistorage is the only other location where there is a showProfile property,
      // then it's okay if only we don't abort the update
      functions.logger.error(`user is in no piStorage doc. uid: ${uid}`);
    }

    batch.update(pistorage.docs[0].ref, {
      [`${uid}.showProfile`]: showProfile,
    });

    await batch.commit();
  });
