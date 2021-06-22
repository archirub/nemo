import {
  createAccountRequest,
  genderOptions,
  Interests,
  mdDatingPickingFromDatabase,
  mdFromDatabase,
  piStorage,
  privateProfileFromDatabase,
  profileFromDatabase,
  Question,
  questionsOptions,
  searchCriteriaOptions,
  SexualPreference,
  sexualPreferenceOptions,
  socialMedia,
  socialMediaOptions,
  successResponse,
  swipeModeOptions,
  SwipeUserInfo,
  uidDatingStorage,
} from "./../../src/app/shared/interfaces/index";
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

export const createAccount = functions
  .region("europe-west2")
  .https.onCall(async (data: createAccountRequest, context): Promise<successResponse> => {
    const MAX_UID_COUNT_PI_STORAGE = 2000;

    const dataHolder: {
      [key in keyof createAccountRequest]: createAccountRequest[key] | null;
    } = {
      uid: null,
      firstName: null,
      dateOfBirth: null,
      picturesCount: null,
      university: null,
      gender: null,
      sexualPreference: null,
      // swipeMode: null,
      biography: null,
      course: null,
      society: null,
      areaOfStudy: null,
      degree: null,
      societyCategory: null,
      interests: null,
      questions: null,
      onCampus: null,
      socialMediaLinks: null,
    };
    // if allowedValues is null, then there are no default values,
    // if property can be null (i.e. is optional), then add "null" to array (if that doesn't work, add property canBeNull: boolean)
    // for arrays, the logic is slightly different, allowedValues are the elements that can be in that array (not what
    // the property must be, but what it must contain), so have a function arrayCheck which takes the property and
    // the content of allowedValues and checks if all members of the array are in allowedValues
    // special function for questions

    // CHECK DATA VALIDITY
    if (!checkData(dataHolder, data, dataChecker)) return { successful: false };

    // Renaming for Typescript
    const checkedData = dataHolder as {
      [key in keyof createAccountRequest]: createAccountRequest[key];
    };

    // GET DEMOGRAPHICS OF USER
    const demographics = getDemographics(checkedData);

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
        addToProfile(transaction, checkedData);
        addToPrivateProfile(transaction, checkedData);
        addToMatchDataMain(transaction, checkedData);
        addToMatchDataDating(transaction, checkedData);
        addToPiStorage(transaction, piStorageDocument, checkedData);
        addToUidDatingStorage(transaction, uidStorageDocuments, checkedData);
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
      console.warn(`uid: ${data.uid}, ${e}`);
      return { successful: false };
    }
  });

function checkData(
  checkedData: {
    [key in keyof createAccountRequest]: createAccountRequest[key] | null;
  },
  incData: createAccountRequest,
  dataChecker_: DataChecker
): boolean {
  for (const [property, value] of Object.entries(incData)) {
    const checks = dataChecker_[property as keyof createAccountRequest];

    // check if key is an allowed property
    if (!checkedData.hasOwnProperty(property)) return false;

    // if the property isn't a required one and its value is null, then no need for the additional checks
    if (!checks.isRequired && value == null) {
      continue;
    }

    if (!checks.typeCheck(value, checks.allowedValues))
      // check if property's value has right type
      // // if options are not required for checking the type (a.k.a it's checking for a string,
      // // a.k.a it's not interests or questions), they are just not used by the function
      return false;

    // checks against the default value options, if there is one and if the value isn't an object,
    if (
      !checks.valueIsObject &&
      checks.allowedValues !== null &&
      !checks.allowedValues.includes(value)
    )
      return false;

    // add property value to checkedData object
    checkedData[property as keyof createAccountRequest] = value;
  }

  return true;
}

function stringCheck(a: any, options: unknown): a is string {
  return typeof a === "string";
}
function interestsCheck(a: any, options: Interests[]): boolean {
  if (!Array.isArray(a)) return false;

  for (const el of a) {
    if (!options.includes(el)) {
      return false;
    }
  }

  return true;
}

function questionsCheck(a: any, options: Question[]): boolean {
  if (!Array.isArray(a)) return false;

  for (const el of a) {
    for (const key in el) {
      if (!["question", "answer"].includes(key)) return false;
      if (typeof el[key] !== "string") return false;
      if (key === "question" && !options.includes(el[key])) return false;
    }
  }

  return true;
}

function sexualPreferenceCheck(a: any, options: SexualPreference[]): boolean {
  if (!Array.isArray(a)) return false;

  let found = false;
  for (const option of options) {
    if (JSON.stringify(option) === JSON.stringify(a)) {
      found = true;
    }
  }
  if (!found) return false;
  return true;
}

function socialMediaLinksCheck(a: any, options: socialMedia[]): boolean {
  if (!Array.isArray(a)) return false;

  for (const el of a) {
    for (const key in el) {
      if (!["socialMedia", "link"].includes(key)) return false;
      if (typeof el[key] !== "string") return false;
      if (key === "socialMedia" && !options.includes(el[key])) return false;
    }
  }
  return true;
}

// function picturesCheck(a: any, options: unknown): boolean {
//   if (!Array.isArray(a)) return false;

//   for (const el of a) {
//     // Checks whether pictures are in base64 format by attempting to decode them
//     try {
//       window.atob(el);
//     } catch {
//       return false;
//     }
//   }

//   return true;
// }

// allowedValues is an array of the default values that the property can have, if there are default values
// isRequired
// the isStrange property serves to tell me whether the data's value can be checked against
// allowedValues. It can't if the value is an object (array, or wtv), and then I already check for the
// validity of the values of typeCheck, where I will have built a special function for checking the type
// of that particular property (case of sexualPref, interests, questions)

const dataChecker: DataChecker = {
  uid: {
    typeCheck: stringCheck,
    allowedValues: null,
    isRequired: true,
    valueIsObject: false,
  },
  firstName: {
    typeCheck: stringCheck,
    allowedValues: null,
    isRequired: true,
    valueIsObject: false,
  },
  dateOfBirth: {
    typeCheck: (a) => a instanceof admin.firestore.Timestamp,
    allowedValues: null,
    isRequired: true,
    valueIsObject: false,
  },
  picturesCount: {
    typeCheck: (a) => typeof a === "number",
    allowedValues: null,
    isRequired: true,
    valueIsObject: false,
  },
  university: {
    typeCheck: stringCheck,
    allowedValues: searchCriteriaOptions.university,
    isRequired: true,
    valueIsObject: false,
  },
  gender: {
    typeCheck: stringCheck,
    allowedValues: genderOptions,
    isRequired: true,
    valueIsObject: false,
  },
  sexualPreference: {
    typeCheck: sexualPreferenceCheck,
    allowedValues: sexualPreferenceOptions,
    isRequired: true,
    valueIsObject: true,
  },
  // swipeMode: {
  //   typeCheck: stringCheck,
  //   allowedValues: swipeModeOptions,
  //   isRequired: true,
  //   valueIsObject: false,
  // },
  // pictures: {
  //   typeCheck: picturesCheck,
  //   allowedValues: null,
  //   isRequired: true,
  //   valueIsObject: true,
  // },
  biography: {
    typeCheck: stringCheck,
    allowedValues: null,
    isRequired: false,
    valueIsObject: false,
  },
  course: {
    typeCheck: stringCheck,
    allowedValues: null,
    isRequired: false,
    valueIsObject: false,
  },
  society: {
    typeCheck: stringCheck,
    allowedValues: null,
    isRequired: false,
    valueIsObject: false,
  },
  areaOfStudy: {
    typeCheck: stringCheck,
    allowedValues: searchCriteriaOptions.areaOfStudy,
    isRequired: false,
    valueIsObject: false,
  },
  degree: {
    typeCheck: stringCheck,
    allowedValues: searchCriteriaOptions.degree,
    isRequired: true,
    valueIsObject: false,
  },
  societyCategory: {
    typeCheck: stringCheck,
    allowedValues: searchCriteriaOptions.societyCategory,
    isRequired: false,
    valueIsObject: false,
  },
  interests: {
    typeCheck: interestsCheck,
    allowedValues: searchCriteriaOptions.interests,
    isRequired: false,
    valueIsObject: true,
  },
  questions: {
    typeCheck: questionsCheck,
    allowedValues: questionsOptions,
    isRequired: true,
    valueIsObject: true,
  },
  onCampus: {
    typeCheck: stringCheck,
    allowedValues: searchCriteriaOptions.onCampus,
    isRequired: false,
    valueIsObject: false,
  },
  socialMediaLinks: {
    typeCheck: socialMediaLinksCheck,
    allowedValues: socialMediaOptions,
    isRequired: false,
    valueIsObject: true,
  },
};

interface demographicMap {
  sexualPreference: ("male" | "female")[];
  gender: ("male" | "female")[];
  degree: "undergrad" | "postgrad";
}

function addToUidDatingStorage(
  transaction: admin.firestore.Transaction,
  uidStorageDocuments: FirebaseFirestore.QuerySnapshot<uidDatingStorage>[],
  data: createAccountRequest
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
        const newUidArray = doc.data().uids.splice(indexInArray, 0, data.uid);
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
  data: createAccountRequest
) {
  const profile: profileFromDatabase = {
    firstName: data.firstName,
    dateOfBirth: admin.firestore.Timestamp.fromDate(data.dateOfBirth),
    pictureCount: data.picturesCount,
    biography: data.biography,
    university: data.university,
    degree: data.degree,
    course: data.course,
    society: data.society,
    interests: data.interests,
    questions: data.questions,
    onCampus: data.onCampus,
    socialMediaLinks: data.socialMediaLinks,
  };
  const ref = admin.firestore().collection("profile").doc(data.uid);

  transaction.set(ref, profile);
}

function addToPrivateProfile(
  transaction: admin.firestore.Transaction,
  data: createAccountRequest
) {
  const privateProfile: privateProfileFromDatabase = {
    settings: {},
    latestSearchCriteria: {
      university: null,
      areaOfStudy: null,
      degree: null,
      societyCategory: null,
      interests: null,
      onCampus: null,
    },
  };
  const ref = admin
    .firestore()
    .collection("profile")
    .doc(data.uid)
    .collection("private")
    .doc("private");

  transaction.set(ref, privateProfile);
}

function addToMatchDataMain(
  transaction: admin.firestore.Transaction,
  data: createAccountRequest
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
  const ref = admin.firestore().collection("matchData").doc(data.uid);

  transaction.set(ref, matchData);
}

function addToMatchDataDating(
  transaction: admin.firestore.Transaction,
  data: createAccountRequest
) {
  const matchDataDating: mdDatingPickingFromDatabase = {
    searchFeatures: {
      university: data.university === "UCL" ? data.university : "UCL",
      areaOfStudy: data.areaOfStudy,
      degree: data.degree,
      societyCategory: data.societyCategory,
      interests: data.interests,
      onCampus: data.onCampus,
    },
    reportedUsers: {},
    superLikedUsers: {},
    likedUsers: {},
    uidCount: 0,
  };
  const ref = admin
    .firestore()
    .collection("matchData")
    .doc(data.uid)
    .collection("pickingData")
    .doc("dating");

  transaction.set(ref, matchDataDating);
}

function addToPiStorage(
  transaction: admin.firestore.Transaction,
  piStorageDocument: FirebaseFirestore.QuerySnapshot<piStorage>,
  data: createAccountRequest
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
      uids: admin.firestore.FieldValue.arrayUnion(data.uid),
      uidCount: admin.firestore.FieldValue.increment(1),
      [`${data.uid}`]: piStorageMap,
    });
  } else {
    const docRef = admin.firestore().collection("piStorage").doc();

    transaction.set(docRef, {
      uids: [data.uid],
      uidCount: 1,
      [`${data.uid}`]: piStorageMap,
    });
  }
}
