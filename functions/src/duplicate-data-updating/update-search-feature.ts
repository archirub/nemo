import { searchFeatureNames } from "./../../../src/app/shared/interfaces/search-criteria.model";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  updateSearchFeaturesRequest,
  searchCriteriaNames,
  piStorage,
  searchCriteriaOptions,
  SearchFeatures,
} from "../../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../supporting-functions/data-validation/main";

export const updateSearchFeatures = functions
  .region("europe-west2")
  .https.onCall(async (data: updateSearchFeaturesRequest, context): Promise<void> => {
    runWeakUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

    const sanitizedData = sanitizeData(
      "updateSearchFeatures",
      data
    ) as updateSearchFeaturesRequest;

    // for all: matchDataDating, matchDataFriend (only these for areaOfStudy, societyCategory)
    // for onCampus, interests, university: profiles
    // for degree: piStorage

    const batch = admin.firestore().batch();

    let failedAddToPiStorage = false;

    await Promise.all(
      sanitizedData.features.map(async (feature) => {
        // All search features are in matchdata, so add to matchdata regardless
        addToMatchData(batch, uid, feature.name, feature.value);

        // only these are in profile
        if (["onCampus", "interests", "university", "degree"].includes(feature.name)) {
          addToProfileDocument(batch, uid, feature.name, feature.value);
        }

        // Only degree of the search features is in piStorage
        if (["degree"].includes(feature.name)) {
          const e = await addToPiStorage(batch, uid, feature.name, feature.value);
          if (e === "failed") failedAddToPiStorage = true;
        }
      })
    );

    if (failedAddToPiStorage)
      throw new functions.https.HttpsError(
        "aborted",
        `failled to add degree to piStorage, uid: ${uid}`
      );

    await batch.commit();
  });

function addToMatchData(
  batch: admin.firestore.WriteBatch,
  uid: string,
  sfName: keyof SearchFeatures,
  sfValue: SearchFeatures[keyof SearchFeatures]
): void {
  const mdDatingRef = admin
    .firestore()
    .collection("matchData")
    .doc(uid)
    .collection("pickingData")
    .doc("dating");
  const mdFriendRef = admin
    .firestore()
    .collection("matchData")
    .doc(uid)
    .collection("pickingData")
    .doc("friend");

  batch.update(mdDatingRef, {
    [`searchFeatures.${sfName}`]: sfValue,
  });

  batch.update(mdDatingRef, {
    [`searchFeatures.${sfName}`]: sfValue,
  });
}

function addToProfileDocument(
  batch: admin.firestore.WriteBatch,
  uid: string,
  sfName: keyof SearchFeatures,
  sfValue: SearchFeatures[keyof SearchFeatures]
): void {
  const profileRef = admin.firestore().collection("profiles").doc(uid);

  batch.update(profileRef, {
    [`${sfName}`]: sfValue,
  });
}

async function addToPiStorage(
  batch: admin.firestore.WriteBatch,
  uid: string,
  sfName: keyof SearchFeatures,
  sfValue: SearchFeatures[keyof SearchFeatures]
): Promise<"failed" | "good fam"> {
  const pistorage = (await admin
    .firestore()
    .collection("piStorage")
    .where("uids", "array-contains", uid)
    .limit(1)
    .get()) as FirebaseFirestore.QuerySnapshot<piStorage>;

  if (pistorage.empty) {
    functions.logger.error(`user seems to be in no piStorage doc. id: ${uid}`);
    return "failed" as const;
  }

  batch.update(pistorage.docs[0].ref, {
    [`${uid}.${sfName}`]: sfValue,
  });

  return "good fam" as const;
}
