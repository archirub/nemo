import {
  createAccountRequest,
  mdDatingPickingFromDatabase,
  mdFromDatabase,
  piStorage,
  privateProfileFromDatabase,
  profileFromDatabase,
  successResponse,
  SwipeUserInfo,
  uidDatingStorage,
} from "./../../../src/app/shared/interfaces/index";
import { runStrongUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../supporting-functions/data-validation/main";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

type DataChecker = {
  [key in keyof createAccountRequest]: {
    typeCheck: (a: any, options: any) => boolean;
    allowedValues: Array<any> | null;
    isRequired: boolean;
    valueIsObject: boolean;
  };
};

// - Convert timestamps back to strings in the front end (i.e. use Date.toString()) for the date of birth
// - then here convert it right away to timestamp from strings by doing Timestamp.fromDate(new Date(stringDate))
// and do the typecheck accordingly OR don't do that specific check, just check whether it's a string and that's all

export const createAccount = functions
  .region("europe-west2")
  .https.onCall(
    async (request: createAccountRequest, context): Promise<successResponse> => {
      const MAX_UID_COUNT_PI_STORAGE = 2000;

      await runStrongUserIdentityCheck(context);

      const uid = context?.auth?.uid as string;

      const sanitizedRequest = sanitizeData(
        "createAccount",
        request
      ) as createAccountRequest;

      // GET DEMOGRAPHICS OF USER
      const demographics = getDemographics(sanitizedRequest);

      try {
        // START THE TRANSACTION
        await admin.firestore().runTransaction(async (transaction) => {
          // FETCH DATA REQUIRED FROM DATABASE
          const databaseFetchingPromises: Promise<
            FirebaseFirestore.QuerySnapshot<any | uidDatingStorage>
          >[] = [];

          // data needed for PI storage
          // (case where no document matches the condition is handled in (addToPiStorage))
          databaseFetchingPromises.push(
            transaction.get(
              admin
                .firestore()
                .collection("piStorage")
                .where("uidCount", "<", MAX_UID_COUNT_PI_STORAGE)
                .limit(1)
            )
          );

          // data needed for uid storage
          for (const gender of demographics.gender) {
            for (const sexPref of demographics.sexualPreference) {
              databaseFetchingPromises.push(
                transaction.get(
                  admin
                    .firestore()
                    .collection("uidDatingStorage")
                    .where("degree", "==", demographics.degree)
                    .where("gender", "==", gender)
                    .where("sexualPreference", "==", sexPref)
                ) as Promise<FirebaseFirestore.QuerySnapshot<uidDatingStorage>>
              );
            }
          }
          const [piStorageDocument, ...uidStorageDocuments] = await Promise.all(
            databaseFetchingPromises
          );

          // SET / UPDATE DOCUMENTS
          addToProfile(transaction, sanitizedRequest, uid);
          addToPrivateProfile(transaction, uid);
          addToMatchDataMain(transaction, sanitizedRequest, uid);
          addToMatchDataDating(transaction, sanitizedRequest, uid);
          addToPiStorage(transaction, piStorageDocument, sanitizedRequest, uid);
          addToUidDatingStorage(transaction, uidStorageDocuments, uid);
        });

        // TO DO
        // DEGREE NEEDS TO BE PART OF REQUIRED FOR BACKEND, otherwise we put them in both categories
        // NEED TO FINALISE ALL DATA FORMAT INCLUDING PICTURES TO FINISH THIS PART

        // pictures: profilePictureUrls;
        // REST TO DO:  CONVERT TO TRANSACTION (absolutely necessary here)

        // USE TRANSACTION INSTEAD SO THAT, let's imagine multiple people are creating an account while
        // the pi storage is at its limit, well multiple new piStorage documents could be created,
        // same thing if we are close to it, multiple people could be added to the document and exceed the limit
        // since the limit is low, it isn't really a problem, but might be a good opportunity to learn this stuff

        return { successful: true };
      } catch (e) {
        console.warn(`uid: ${uid}, ${e}`);
        return { successful: false, message: "some shit went down: " + e };
      }
    }
  );

interface demographicMap {
  sexualPreference: ("male" | "female")[];
  gender: ("male" | "female")[];
  degree: "undergrad" | "postgrad";
}

function addToUidDatingStorage(
  transaction: admin.firestore.Transaction,
  uidStorageDocuments: FirebaseFirestore.QuerySnapshot<uidDatingStorage>[],
  // data: createAccountRequest,
  uid: string
) {
  // that step is the most complex, since the uidDatingStorage uid arrays are ordered
  // in percentile, and their may me multiple uidDatingStorage arrays, for which, if we add
  // together their uid arrays, they form the full uid distribution for that particular demographic
  // so, for each demographic, we need to find the total number of uids there, and insert the person's uid
  // in the middle of that, and where the middle is depends on the length of the array of each volume, and whether
  // or not there are multiple volumes.

  // stores (/ will store) the new uids array and the ref for each document that was modified
  const modifiedUidArrays: {
    ref: FirebaseFirestore.DocumentReference<uidDatingStorage>;
    uids: string[];
  }[] = [];
  uidStorageDocuments.forEach((querySnapshot) => {
    // sorts docs according to volume while extracting the length
    // of the uid arrays
    const docs = querySnapshot.docs.sort((a, b) => a.data().volume - b.data().volume);

    // so if we have documents with ordered volume with # of uids per uid array
    // equal to 20, 34, 12, 1, then the variable below is [20, 54, 66, 67]
    const totalUidsUpToIndex: number[] = [];

    // fill totalUidsUpToIndex
    docs.forEach((doc, index) => {
      totalUidsUpToIndex.push(
        (totalUidsUpToIndex[totalUidsUpToIndex.length - 1] || 0) + doc.data().uids.length
      );
    });

    // find the middle index (since we say the person has index 0.5 when he starts
    // so we instert him at the middle)
    const midIndex = Math.floor(totalUidsUpToIndex[totalUidsUpToIndex.length - 1] / 2);

    for (const [index, doc] of docs.entries()) {
      // check if midIndex falls in that array
      if (totalUidsUpToIndex[index] - midIndex > 0) {
        const indexInArray = midIndex - (totalUidsUpToIndex[index - 1] || 0);
        const newUidArray = doc.data().uids.splice(indexInArray, 0, uid);
        modifiedUidArrays.push({ ref: doc.ref, uids: newUidArray });
        // break out since we found the array to add to
        break;
      }
    }
  });

  // batch update each new uid array
  modifiedUidArrays.forEach((map) => {
    transaction.update(map.ref, {
      uids: map.uids,
    });
  });
}

function getDemographics(data: createAccountRequest): demographicMap {
  if (data.gender === "other") {
    return {
      sexualPreference: data.sexualPreference,
      gender: ["male", "female"],
      degree: data.degree,
    };
  } else {
    return {
      sexualPreference: data.sexualPreference,
      gender: [data.gender],
      degree: data.degree,
    };
  }
}

function addToProfile(
  transaction: admin.firestore.Transaction,
  data: createAccountRequest,
  uid: string
) {
  const profile: profileFromDatabase = {
    firstName: data.firstName,
    dateOfBirth: admin.firestore.Timestamp.fromDate(new Date(data.dateOfBirth)) as any,
    pictureCount: data.picturesCount,
    biography: data.biography,
    university: data.university,
    degree: data.degree,
    course: data.course,
    society: data.society,
    societyCategory: data.societyCategory,
    areaOfStudy: data.areaOfStudy,
    interests: data.interests,
    questions: data.questions,
    // onCampus: data.onCampus,
    socialMediaLinks: data.socialMediaLinks,
  };
  const ref = admin.firestore().collection("profiles").doc(uid);

  transaction.set(ref, profile);
}

function addToPrivateProfile(transaction: admin.firestore.Transaction, uid: string) {
  const privateProfile: privateProfileFromDatabase = {
    settings: { showProfile: true },
    latestSearchCriteria: {
      university: null,
      areaOfStudy: null,
      degree: null,
      societyCategory: null,
      interests: null,
      // onCampus: null,
    },
  };
  const ref = admin
    .firestore()
    .collection("profiles")
    .doc(uid)
    .collection("private")
    .doc("private");

  transaction.set(ref, privateProfile);
}

function addToMatchDataMain(
  transaction: admin.firestore.Transaction,
  data: createAccountRequest,
  uid: string
) {
  const matchData: mdFromDatabase = {
    matchedUsers: {},
    dislikedUsers: {},
    fmatchedUsers: {},
    fdislikedUsers: {},
    reportedUsers: {},
    gender: data.gender,
    sexualPreference: data.sexualPreference,
    swipeMode: "dating",
    // swipeMode: data.swipeMode,
    uidCount: 0,
  };
  const ref = admin.firestore().collection("matchData").doc(uid);

  transaction.set(ref, matchData);
}

function addToMatchDataDating(
  transaction: admin.firestore.Transaction,
  data: createAccountRequest,
  uid: string
) {
  const matchDataDating: mdDatingPickingFromDatabase = {
    searchFeatures: {
      university: data.university,
      areaOfStudy: data.areaOfStudy,
      degree: data.degree,
      societyCategory: data.societyCategory,
      interests: data.interests,
      // onCampus: data.onCampus,
    },
    reportedUsers: {},
    superLikedUsers: {},
    likedUsers: {},
    uidCount: 0,
  };
  const ref = admin
    .firestore()
    .collection("matchData")
    .doc(uid)
    .collection("pickingData")
    .doc("dating");

  transaction.set(ref, matchDataDating);
}

function addToPiStorage(
  transaction: admin.firestore.Transaction,
  piStorageDocument: FirebaseFirestore.QuerySnapshot<piStorage>,
  data: createAccountRequest,
  uid: string
) {
  const piStorageMap: SwipeUserInfo = {
    seenCount: 0,
    likeCount: 0,
    percentile: 0.5,
    gender: data.gender,
    sexualPreference: data.sexualPreference,
    degree: data.degree,
    showProfile: true,
    // swipeMode: data.swipeMode,
    swipeMode: "dating",
  };

  if (!piStorageDocument.empty) {
    transaction.update(piStorageDocument.docs[0].ref, {
      uids: admin.firestore.FieldValue.arrayUnion(uid),
      uidCount: admin.firestore.FieldValue.increment(1),
      [`${uid}`]: piStorageMap,
    });
  } else {
    const docRef = admin.firestore().collection("piStorage").doc();

    transaction.set(docRef, {
      uids: [uid],
      uidCount: 1,
      [`${uid}`]: piStorageMap,
    });
  }
}
