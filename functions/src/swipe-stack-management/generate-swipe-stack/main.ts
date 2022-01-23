import {
  generateSwipeStackRequest,
  generateSwipeStackResponse,
  mdMainFromDatabase,
  piStorage,
  searchCriteria,
  SwipeMode,
  uidChoiceMap,
} from "../../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { datingMode } from "./dating-mode";
import { friendMode } from "./friend-mode";
import { runWeakUserIdentityCheck } from "../../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../../supporting-functions/data-validation/main";
import {
  emptyCollectionOrQueryError,
  invalidDocumentError,
  notFoundDocumentError,
} from "../../supporting-functions/error-handling/generic-errors";

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

export const generateSwipeStack = functions
  .region("europe-west2")
  .https.onCall(
    async (
      request: generateSwipeStackRequest,
      context
    ): Promise<generateSwipeStackResponse> => {
      // DEV - uncomment
      // runWeakUserIdentityCheck(context);

      // DEV - uncomment
      // const uid = context?.auth?.uid as string;

      // DEV - remove
      const uid = "15Ch7byvH0YEcXO6aYI62eruRAx1";

      const sanitizedRequest = sanitizeData(
        "generateSwipeStack",
        request
      ) as generateSwipeStackRequest;

      functions.logger.log("sanitizedRequest:", JSON.stringify(sanitizedRequest));
      // return "" as any as generateSwipeStackResponse;

      // eslint-disable-next-line no-shadow
      const searchCriteria: searchCriteria = sanitizedRequest.searchCriteria;

      // DATA FOR TESTING <-> UNCOMMENT BELOW AND COMMENT ABOVE
      // const uid: string = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";
      // const searchCriteria: searchCriteria = {
      //   university: null,
      //   areaOfStudy: "biology",
      //   degree: null,
      //   societyCategory: null,
      //   interests: null,
      //   onCampus: null,
      // };

      // INDEPENDENT PARAMETERS
      const profilesPerWave: number = 20;
      const PIPickingVariance: number = 3.5;
      const SCPickingVariance: number = 1.7;
      const pickingWeights: PickingWeights = {
        likeGroup: 0.2,
        searchCriteriaGroup: 0.8,
      };

      const matchDataMainDoc = await admin
        .firestore()
        .collection("matchData")
        .doc(uid)
        .get();
      if (!matchDataMainDoc.exists) notFoundDocumentError("matchData", uid, uid);
      const matchDataMain = matchDataMainDoc.data() as mdMainFromDatabase;

      // const swipeMode: SwipeMode = matchDataMain.swipeMode;
      let pickedUsers: uidChoiceMap[] = [];

      // if (swipeMode === "dating") {

      const piStorageQuery = await admin
        .firestore()
        .collection("piStorage")
        .where("uids", "array-contains", uid)
        .limit(1)
        .get();

      if (piStorageQuery.empty)
        emptyCollectionOrQueryError(
          "piStorage",
          uid,
          `.where("uids", "array-contains", ${uid}).limit(1)`
        );

      const piStorageData = piStorageQuery.docs[0].data() as piStorage;

      const percentile = piStorageData?.[uid]?.percentile;

      if (!percentile)
        invalidDocumentError(
          "piStorage",
          `['${uid}'].percentile`,
          piStorageQuery.docs[0].id,
          uid
        );

      pickedUsers = await datingMode(
        uid,
        matchDataMain,
        searchCriteria,
        percentile,
        pickingWeights,
        PIPickingVariance,
        SCPickingVariance,
        profilesPerWave
      );

      // } else if (swipeMode === "friend") {
      //   pickedUsers = await friendMode(
      //     uid,
      //     matchDataMain,
      //     searchCriteria,
      //     pickingWeights,
      //     SCPickingVariance,
      //     profilesPerWave
      //   );
      // } else {
      //   throw new functions.https.HttpsError(
      //     "aborted",
      //     `Unrecognized swipeMode: ${swipeMode}`
      //   );
      // }

      // SENDING RESPONSE

      const response: generateSwipeStackResponse = { users: pickedUsers };

      return response;
    }
  );

// function removeElementInFrom(
//   array: uidChoiceMap[],
//   toRemove: uidChoiceMap[]
// ): uidChoiceMap[] {
//   if (!toRemove) return array ? array : [];

//   const toRemoveUIDs = toRemove.map((map) => map.uid);

//   return array.filter((map) => !toRemoveUIDs.includes(map.uid));
// }
