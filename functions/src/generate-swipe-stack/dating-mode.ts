import * as admin from "firebase-admin";
import {
  Degree,
  Gender,
  mdDatingPickingFromDatabase,
  mdFromDatabase,
  searchCriteriaFromDatabase,
  SexualPreference,
  uidChoiceMap,
  uidDatingStorage,
} from "../../../src/app/shared/interfaces/index";
import { pickFromSCArray, pickIndex, randomWeightedPick } from "./picking";
import { PickingWeights } from "./main";
import { searchCriteriaGrouping } from "./search-criteria";

export async function datingMode(
  uid: string,
  matchDataMain: mdFromDatabase,
  searchCriteria: searchCriteriaFromDatabase,
  percentile: number | null,
  pickingWeights: PickingWeights,
  PIPickingVariance: number,
  SCPickingVariance: number,
  numberOfPicks: number
): Promise<uidChoiceMap[]> {
  const demographicPicksCount: number = Math.floor(
    numberOfPicks * pickingWeights.searchCriteriaGroup * 2
  );
  const numberOfSCPicks: number = Math.floor(demographicPicksCount * 0.5);
  const numberOfLikePicks: number = Math.floor(numberOfPicks * 1.2);

  // GET USERS WHO LIKE TARGET
  const likeGroupChoiceMaps: { [uid: string]: uidChoiceMap } = {};
  (await fetchLikeGroup(uid, numberOfLikePicks)).forEach((uid_) => {
    likeGroupChoiceMaps[uid_] = { uid: uid_, choice: "yes" };
  });

  // FIX DEGREE DEMOGRAPHIC (null === no preference)
  const degreePreference: Degree[] = searchCriteria.degree
    ? [searchCriteria.degree]
    : ["postgrad", "undergrad"];

  // GET DEMOGRAPHICS THAT SHOULD BE FETCHED
  const {
    genderToFetch,
    sexualPreferenceToFetch,
    degreeToFetch,
  } = getDemographicsToFetch(
    matchDataMain.gender,
    matchDataMain.sexualPreference,
    degreePreference
  );

  // FETCH DEMOGRAPHICS
  const uidStorageDocumentPromises: Promise<
    FirebaseFirestore.QuerySnapshot<uidDatingStorage>
  >[] = [];
  for (const degree of degreeToFetch) {
    for (const gender of genderToFetch) {
      for (const sexPref of sexualPreferenceToFetch) {
        uidStorageDocumentPromises.push(
          admin
            .firestore()
            .collection("uidDatingStorage")
            .where("degree", "==", degree)
            .where("gender", "==", gender)
            .where("sexualPreference", "==", sexPref)
            .get() as Promise<FirebaseFirestore.QuerySnapshot<uidDatingStorage>>
        );
      }
    }
  }

  const uidStorageDocuments = ([] as FirebaseFirestore.QueryDocumentSnapshot<uidDatingStorage>[]).concat
    .apply(
      [],
      (await Promise.all(uidStorageDocumentPromises)).map((doc) => doc.docs)
    )
    .map((doc) => doc?.data());

  // CONCAT DOCUMENTS OF SAME DEMOGRAPHIC
  const DemographicArrays: string[][] = concatSameDemographics(
    uidStorageDocuments,
    genderToFetch,
    sexualPreferenceToFetch,
    degreeToFetch
  );

  // PICK FROM DEMOGRAPHIC ARRAYS
  let demographicUidsCount = 0;
  DemographicArrays.forEach((array) => (demographicUidsCount += array.length));

  let demographicPicks: string[] = pickFromDemographicArrays(
    DemographicArrays,
    PIPickingVariance,
    Math.min(demographicPicksCount, demographicUidsCount),
    typeof percentile === "number" && percentile > 0 ? percentile : 0.5
  );

  // REMOVE UIDS OF PEOPLE THAT CAN'T BE IN SWIPE STACK
  demographicPicks = demographicPicks.filter(
    (pickedUid) =>
      !matchDataMain.reportedUsers[pickedUid]?.exists &&
      !matchDataMain.dislikedUsers[pickedUid]?.exists &&
      !matchDataMain.matchedUsers[pickedUid]?.exists &&
      !likeGroupChoiceMaps.hasOwnProperty(pickedUid)
  );

  // REMOVE DUPLICATES IN LIKEGROUP
  const likeGroupUsers: uidChoiceMap[] = removeDuplicates(
    Object.entries(likeGroupChoiceMaps).map((keyValue) => keyValue[1])
  );

  // FETCH DATING MATCHDATA DOC OF ALL PEOPLE LEFT
  const matchDataDatingDocs = (
    await Promise.all(
      demographicPicks.map(async (uid_) => {
        return (await admin
          .firestore()
          .collection("matchData")
          .doc(uid_)
          .collection("pickingData")
          .doc("dating")
          .get()) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>;
      })
    )
  ).filter((doc) => {
    // REMOVE IF DOC DOESN'T EXIST
    if (!doc.exists) return false;
    // REMOVE USERS WITH TARGET IN THEIR REPORTED
    if (doc.data()?.reportedUsers[uid]?.exists) return false;
    // REMOVE IF onCampus only is activated, and user isn't on campus
    if (searchCriteria.onCampus === true && doc.data()?.searchFeatures.onCampus !== true)
      return false;
    return true;
  });

  // SORT BASED ON SEARCH CRITERIA
  delete (searchCriteria as any).degree;
  let SCuids = searchCriteriaGrouping(matchDataDatingDocs, searchCriteria);

  // PICK ACCORDING TO NORMAL DISTRIBUTION AROUND PERFECT MATCH
  SCuids = pickFromSCArray(
    SCuids as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[],
    SCPickingVariance,
    numberOfSCPicks > SCuids.length ? SCuids.length : numberOfSCPicks
  ) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[];

  // REMOVE DUPLICATE USERS
  const SCGroupUsers = removeDuplicates(
    datingPickingToMap(
      uid,
      SCuids as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[]
    )
  );

  // MAKE A RANDOM WEIGHTED PICK
  const uidsPicked =
    randomWeightedPick(
      [SCGroupUsers, likeGroupUsers],
      [pickingWeights.searchCriteriaGroup, pickingWeights.likeGroup],
      Math.min(SCGroupUsers.length + likeGroupUsers.length, numberOfPicks)
    ) || [];

  return uidsPicked;
}

/**
 * Takes in the gender, sexPref and degree of the person, and returns the
 * categories of the uid storage documents that must be fetched
 * WATCH OUT, DEGREE MUST BE THE SEARCH CRITERIA PREFERENCE, NOT THE PERSON'S DEGREE
 */
function getDemographicsToFetch(
  gender_: Gender,
  sexualPreference_: SexualPreference,
  degreePreference_: Degree[]
): {
  genderToFetch: SexualPreference;
  sexualPreferenceToFetch: SexualPreference;
  degreeToFetch: Degree[];
} {
  const degreeToFetch: Degree[] = degreePreference_;
  const genderToFetch: SexualPreference = sexualPreference_;
  let sexualPreferenceToFetch: SexualPreference;

  if (gender_ === "other") {
    // In the case where someone's gender is "other", then only their
    // own sexual preference and their own degree preference should determine who they are shown
    // hence, the sexual preference of the other person's does not matter in this
    sexualPreferenceToFetch = ["male", "female"];
  } else {
    sexualPreferenceToFetch = [gender_] as SexualPreference;
  }

  return { genderToFetch, sexualPreferenceToFetch, degreeToFetch };
}

/** Returns the an array of arrays of the uids fitting different demographics
  Necessary for when there are multiple pi storage documents for one demographic
*/
function concatSameDemographics(
  uidStorageArrays: uidDatingStorage[],
  genderToFetch: SexualPreference,
  sexualPreferenceToFetch: SexualPreference,
  degreeToFetch: Degree[]
): string[][] {
  const diffDemographicUidArrays: string[][] = [];

  for (const degree of degreeToFetch) {
    for (const gender of genderToFetch) {
      for (const sexPref of sexualPreferenceToFetch) {
        const uidArray: string[] = ([] as any).concat.apply(
          [],
          uidStorageArrays
            .filter(
              (uidStorage) =>
                uidStorage.degree === degree &&
                uidStorage.sexualPreference === sexPref &&
                uidStorage.gender === gender
            )
            .sort((a, b) => a.volume - b.volume)
            .map((array) => array.uids)
        );
        if (uidArray && uidArray.length > 0) {
          diffDemographicUidArrays.push(uidArray);
        }
      }
    }
  }
  return diffDemographicUidArrays;
}
// SOMETHING YOU FORGOT TO ADD, BUT ITS OKAY YOU CAN DO THAT AFTERWARDS, JUST FINISH THE ST Algo
// You need to pick from a Gaussian around the user's position in the array of people
// however, you don't have information on what people's PI is in the array, and your uid
// is only in one of these arrays so you need some adaptative changes wrt that

// What could work is to get person's uid, find person closest to that in the piStorage that has the right
// degree, sexualPref, gender (so that they actually show up in the array you look through), find that person's
// uid position in the array, and take that as the mean of the Gaussian to pick from
//
// Above solution doesn't work since that info isn't in separate documents of a collection, so we can't
// use the power of indexing here
// Instead, the best solution seems to store the index of the user's uid in each demographic array
// relevant (i.e. all those that match his "would be" position if he were placed in that )

// the best way actually is, to account for the fact that different demographics have different distributions of PI (women
// will have higher variance than men for example), what we need to do is actually match someone's percentile in their own
// demographic to the percentile in the demographic in which they are looking. So if I am a man and I am at position 930 out of 1400 in my demographic array,
// then i am at the 66.4th percentile of my distribution, and if I am attracted to female attracted to male undergrad,
// then the mean of the Gaussian that I need to pick from in that distribution is at the 66.4th percentile. So the only information
// that is needed is one's own percentile. That shall be prestored in one of the matchData document, probably the main one

function pickFromDemographicArrays(
  diffDemographicUidArrays: string[][],
  variance: number,
  numberOfPicks: number,
  percentile: number
): string[] {
  // eslint-disable-next-line no-param-reassign
  percentile = percentile ? percentile : 0.5;

  // For Calibrating Gaussian
  const lengthsOfUidArrays: number[] = [];
  diffDemographicUidArrays.forEach((uidArray) => {
    lengthsOfUidArrays.push(uidArray.length);
  });

  // For storing indexes picked per demographic. Stored as object rather than array
  // for most efficiently checking if index has already been picked
  const uidIndexesPicked: { [index: number]: true }[] = Array.from({
    length: lengthsOfUidArrays.length,
  }).map((el) => []);

  // console.log(
  //   "diff",
  //   diffDemographicUidArrays,
  //   "var",
  //   variance,
  //   "num",
  //   numberOfPicks,
  //   "length",
  //   lengthsOfUidArrays,
  //   "indexes picked",
  //   uidIndexesPicked
  // );

  // PICK INDEXES
  Array.from({ length: numberOfPicks }).forEach(() => {
    const indexOfArrayPicked: number = Math.floor(
      Math.random() * lengthsOfUidArrays.length
    );

    const mean = Math.floor(percentile * (lengthsOfUidArrays[indexOfArrayPicked] - 1));
    const upperBound: number = lengthsOfUidArrays[indexOfArrayPicked] - 1;
    const lowerBound = 0;

    // HAVE TO HANDLE IF RANDOMFROMGAUSSIAN RETURNS -1 (i.e. there was a problem)
    const indexPicked: number = pickIndex(
      uidIndexesPicked[indexOfArrayPicked],
      mean,
      lowerBound,
      upperBound,
      variance
    );
    // temporary
    if (indexPicked !== -1) {
      // Saves index to object
      uidIndexesPicked[indexOfArrayPicked][indexPicked] = true;
    }
  });

  // RETURN UIDs CORRESPONDING TO INDEXES PICKED
  const uidsPicked: string[] = [];
  uidIndexesPicked.forEach((uidIndexMap, indexOfMap) => {
    for (const i in uidIndexMap) {
      uidsPicked.push(diffDemographicUidArrays[indexOfMap][i]);
    }
  });

  // to remove duplicates but is it even necessary? I think only people with "other"
  // as their gender can be in different arrays, so maybe just do that at the very very end
  // and just once
  return uidsPicked;
}

function datingPickingToMap(
  targetuid: string,
  matchDataDocs: FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[]
): uidChoiceMap[] {
  if (!matchDataDocs || !targetuid) return [];
  return matchDataDocs.map((doc) => {
    const data = doc.data() as mdDatingPickingFromDatabase;
    const choice = data.superLikedUsers[targetuid]?.exists
      ? "super"
      : data.likedUsers[targetuid]?.exists
      ? "yes"
      : "no";

    return {
      uid: doc.ref.parent.parent?.id || "",
      choice,
    };
  });
}

async function fetchLikeGroup(uid: string, amount: number): Promise<string[]> {
  const likeGroupSnapshot = await admin
    .firestore()
    .collectionGroup("dating")
    .where("likedUsers", "array-contains", uid)
    .limit(amount)
    .get();

  return likeGroupSnapshot.docs
    .map((doc) => doc.ref.parent.parent?.id)
    .filter((id) => typeof id === "string") as string[];
}

function removeDuplicates(maps: uidChoiceMap[]): uidChoiceMap[] {
  return maps.filter(
    (map, index, self) => index === self.findIndex((t) => t.uid === map.uid)
  );
}
