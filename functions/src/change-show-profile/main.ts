import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  changeShowProfileRequest,
  changeShowProfileResponse,
  piStorage,
} from "../../../src/app/shared/interfaces/index";

export const changeShowProfile = functions.region("europe-west2").https.onCall(
  async (data: changeShowProfileRequest, context): Promise<changeShowProfileResponse> => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User not autenticated.");

    const uid: string = context.auth.uid;
    const showProfile: Boolean = data.showProfile;

    if (typeof showProfile !== "boolean") {
      return { successful: false };
    }
    const pistorage = (await admin
      .firestore()
      .collection("piStorage")
      .where("uids", "array-contains", uid)
      .limit(1)
      .get()) as FirebaseFirestore.QuerySnapshot<piStorage>;
    const matchDataRef = admin.firestore().collection("matchData").doc(uid);
    const privateProfileRef = admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .collection("private")
      .doc("private");

    const batch = admin.firestore().batch();

    batch.update(matchDataRef, {
      showProfile: showProfile,
    });

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
