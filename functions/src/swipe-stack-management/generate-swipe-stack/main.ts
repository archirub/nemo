import {
  generateSwipeStackRequest,
  generateSwipeStackResponse,
  mdFromDatabase,
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
      runWeakUserIdentityCheck(context);

      const uid = context?.auth?.uid as string;

      const sanitizedRequest = sanitizeData(
        "generateSwipeStack",
        request
      ) as generateSwipeStackRequest;

      // eslint-disable-next-line no-shadow
      const searchCriteria: searchCriteria = sanitizedRequest.searchCriteria;

      // DATA FOR TESTING <-> UNCOMMENT BELOW AND COMMENT ABOVE
      // const targetuid: string = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";
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

      const matchDataMain = (
        await admin.firestore().collection("matchData").doc(uid).get()
      ).data() as mdFromDatabase;

      // const swipeMode: SwipeMode = matchDataMain.swipeMode;
      let pickedUsers: uidChoiceMap[] = [];

      // if (swipeMode === "dating") {
      const percentile = (
        (
          await admin
            .firestore()
            .collection("piStorage")
            .where("uids", "array-contains", uid)
            .limit(1)
            .get()
        ).docs[0].data() as piStorage
      )[uid].percentile;

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
      return { users: pickedUsers } as generateSwipeStackResponse;
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
