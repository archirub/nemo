import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  successResponse,
  updateSearchFeatureRequest,
  searchCriteriaNames,
  piStorage,
  searchCriteriaOptions,
  SearchFeatures,
} from "../../../src/app/shared/interfaces/index";

export const updateSearchFeature = functions
  .region("europe-west2")
  .https.onCall(
    async (data: updateSearchFeatureRequest, context): Promise<successResponse> => {
      if (!context.auth)
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User not authenticated."
        );

      const uid: string = context.auth.uid;

      // for testing
      // const uid = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";

      const sfName: keyof SearchFeatures = data.name;
      const sfValue: SearchFeatures[keyof SearchFeatures] = data.value;

      // Veryfing name of search feature
      if (!searchCriteriaNames.includes(sfName)) {
        return { successful: false };
      }

      // veryfing value of search feature
      if (!(searchCriteriaOptions[sfName] as unknown as any[]).includes(sfValue)) {
        return { successful: false };
      }

      // for all: matchDataDating, matchDataFriend (only these for areaOfStudy, societyCategory)
      // for onCampus, interests, university: profiles
      // for degree: piStorage

      const batch = admin.firestore().batch();

      // All search features are in matchdata, so add to matchdata regardless
      addToMatchData(batch, uid, sfName, sfValue);

      // only these are in profile
      if (["onCampus", "interests", "university", "degree"].includes(sfName)) {
        addToProfileDocument(batch, uid, sfName, sfValue);
      }

      // Only degree of the search features is in piStorage
      if (["degree"].includes(sfName)) {
        const e = await addToPiStorage(batch, uid, sfName, sfValue);
        if (e === "failed") {
          return { successful: false };
        }
      }

      try {
        await batch.commit();
        return { successful: true };
      } catch (e) {
        functions.logger.error(`Error for ${uid} : ${e}`);
        return { successful: false };
      }
    }
  );

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
