import {
  generateSwipeStackRequest,
  generateSwipeStackResponse,
  mdDatingPickingFromDatabase,
  mdFromDatabase,
  searchCriteriaFromDatabase,
  uidChoiceMap,
} from "../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { datingMode } from "./dating-mode";

// to test function locally:
// 1. convert functions to javascript using "npm run build" in the "functions" folder
// 2. run "firebase experimental:functions:shell" to go into test mode
// 3. run the function in the same terminal

// For local testing, uncomment the 5 lines below, and comment out "admin.initializeApp();"

// const serviceAccount = require("../nemo-dev-1b0bc-firebase-adminsdk-d8ozt-60b942febb.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://nemo-dev-1b0bc.firebaseio.com",
// });

// admin.initializeApp();

// LEFT TO DO FOR THIS ALGORITHM:
// - SANITIZE INCOMING DATA
// - CREATE FUNCTION TO DEFINE DYNAMICALLY THE NUMBER OF PROFILES TO FETCH (on PI scale)
// (That amount is different from the number of profiles per wave as
// we need to pick randomly from each group & maybe some other reason that I forgot about)
// - ADD GENDER AND SEXUAL PREFERENCE LOGIC A.K.A. picking only people that match the gender of your
// sexual preference and whose sexual preference is your own gender.

export interface PickingWeights {
  likeGroup: number;
  searchCriteriaGroup: number;
}

export const generateSwipeStack = functions.region("europe-west2").https.onCall(
  async (
    data: generateSwipeStackRequest,
    context
  ): Promise<generateSwipeStackResponse> => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User no autenticated.");

    // DATA FROM REQUEST
    const targetuid: string = context.auth.uid;
    const searchCriteria: searchCriteriaFromDatabase = data.searchCriteria || {};

    // DATA FOR TESTING <-> UNCOMMENT BELOW AND COMMENT ABOVE
    // const targetuid: string = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";
    // const searchCriteria: searchCriteriaFromDatabase = {
    //   university: null,
    //   areaOfStudy: "biology",
    //   degree: null,
    //   societyCategory: null,
    //   interest: null,
    //   onCampus: null,
    // };

    // INDEPENDENT PARAMETERS
    const maxPI: number = 1;
    const minPI: number = 0;
    const profilesPerWave: number = 20;
    const PIprofilesToFetch: number = 50;
    const PIPickingVariance: number = 3.5;
    const SCPickingVariance: number = 1.7;
    const pickingWeights: PickingWeights = {
      likeGroup: 0.2,
      searchCriteriaGroup: 0.8,
    };

    // DEPENDENT PARAMETERS
    const averagePI: number = (maxPI + minPI) / 2;
    const likeGroupCount: number = profilesPerWave * pickingWeights.likeGroup;
    try {
      const matchDataMain = (
        await admin.firestore().collection("matchData").doc(targetuid).get()
      ).data() as mdFromDatabase;

      const pickedUsers = await datingMode(
        targetuid,
        matchDataMain,
        searchCriteria,
        pickingWeights,
        PIPickingVariance,
        SCPickingVariance,
        profilesPerWave
      );

      // SENDING RESPONSE
      // response.send({ IDs: pickedIDs });
      return { users: pickedUsers } as generateSwipeStackResponse;
    } catch (e) {
      throw new functions.https.HttpsError("unknown", e);
    }
  }
);

export function removeElementInFrom(
  array: uidChoiceMap[],
  toRemove: uidChoiceMap[]
): uidChoiceMap[] {
  if (!toRemove) return array ? array : [];

  const toRemoveUIDs = toRemove.map((map) => map.uid);

  return array.filter((map) => !toRemoveUIDs.includes(map.uid));
}

async function fetchLikeGroup(
  targetID: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]> {
  const matchDataCollection = admin.firestore().collection("matchData");

  const likeGroupSnapshot = await matchDataCollection
    .where("likedUsers", "array-contains", targetID)
    .get();

  return likeGroupSnapshot.docs;
}

async function fetchPIGroup(
  targetPI: number,
  averagePI: number,
  userCount: number
): Promise<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]> {
  const matchDataCollection = admin.firestore().collection("matchData");
  const halfUserCount = Math.floor(userCount / 2);
  function largerThanAverage(PI: number) {
    return PI > averagePI;
  }

  if (largerThanAverage(targetPI)) {
    // FETCH HIGHER PIs FIRST (in case there aren't enough profiles found (i.e. PI is too high),
    // then more profiles can be fetched at the lower bound)
    const upperProfilesSnapshot = await matchDataCollection
      .orderBy("PI")
      .where("PI", ">", targetPI)
      .limit(halfUserCount)
      .get();

    const upperProfilesLength = upperProfilesSnapshot.docs.length;
    const remainingProfilesToFetch = userCount - upperProfilesLength;

    const lowerProfilesSnapshot = await matchDataCollection
      .orderBy("PI")
      .where("PI", "<", targetPI)
      .limit(remainingProfilesToFetch)
      .get();

    return [...lowerProfilesSnapshot.docs, ...upperProfilesSnapshot.docs];
  } else {
    // FETCH LOWER PIs FIRST (same reason as above, reversed)
    const lowerProfilesSnapshot = await matchDataCollection
      .orderBy("PI")
      .where("PI", ">", targetPI)
      .limit(halfUserCount)
      .get();

    const lowerProfilesLength = lowerProfilesSnapshot.docs.length;
    const remainingProfilesToFetch = userCount - lowerProfilesLength;

    const upperProfilesSnapshot = await matchDataCollection
      .orderBy("PI")
      .where("PI", "<", targetPI)
      .limit(remainingProfilesToFetch)
      .get();

    return [...lowerProfilesSnapshot.docs, ...upperProfilesSnapshot.docs];
  }
}
