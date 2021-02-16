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
  pickingWeights: PickingWeights,
  PIPickingVariance: number,
  SCPickingVariance: number,
  numberOfPicks: number
): Promise<uidChoiceMap[]> {
  const numberOfDemographicPicks: number = Math.floor(
    numberOfPicks * pickingWeights.searchCriteriaGroup * 2
  );
  const numberOfSCPicks: number = Math.floor(numberOfDemographicPicks * 0.5);
  const numberOfLikePicks: number = Math.floor(numberOfPicks * 1.2);

  // Accounts for degree pref being potentially null, if null it means no preference
  // from user, and hence
  const degreePreference: Degree[] = searchCriteria.degree
    ? [searchCriteria.degree]
    : ["postgrad", "undergrad"];

  const likeGroupWeirdObject: { [uid: string]: uidChoiceMap } = {};
  (await fetchLikeGroup(uid, numberOfLikePicks)).forEach((uid_) => {
    likeGroupWeirdObject[uid_] = { uid: uid_, choice: "yes" };
  });

  const {
    genderToFetch,
    sexualPreferenceToFetch,
    degreeToFetch,
  } = getDemographicsToFetch(
    matchDataMain.gender,
    matchDataMain.sexualPreference,
    degreePreference
  );

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

  const DemographicUidArrays: string[][] = concatSameDemographics(
    uidStorageDocuments,
    genderToFetch,
    sexualPreferenceToFetch,
    degreeToFetch
  );

  let numberOfDemographicUids = 0;
  DemographicUidArrays.forEach((array) =>
    array.forEach(() => (numberOfDemographicUids += 1))
  );
  let demographicPickedUids: string[] = pickFromDemographicArrays(
    DemographicUidArrays,
    PIPickingVariance,
    numberOfDemographicPicks > numberOfDemographicUids
      ? numberOfDemographicUids
      : numberOfDemographicPicks,
    matchDataMain.percentile
  );

  // reported users, matched users, disliked users (liked and superliked removed later on)
  // Instead of using array you could simply make one of the two an object to make O(N) not O(N^2)
  // The longest list will most likely be the "disliked/matched/reported" (in total) so maybe you should
  // make these maps {[uid: string]: true} (that way you only iterate over the demographicPickedUid array
  // which is super small. You just have to make sure that doesn't restrain you from doing other operations
  // (like maybe at some point you actually need to use where("field", "contains", "...") and that won't be
  // possible with maps? Gotta think about that))

  // REMOVE UIDS OF PEOPLE THAT CAN'T BE IN SWIPE STACK
  demographicPickedUids = demographicPickedUids.filter(
    (pickedUid) =>
      !matchDataMain.reportedUsers[pickedUid]?.exists &&
      !matchDataMain.dislikedUsers[pickedUid]?.exists &&
      !matchDataMain.matchedUsers[pickedUid]?.exists &&
      !likeGroupWeirdObject.hasOwnProperty(pickedUid)
  );
  const likeGroupUsers: uidChoiceMap[] = removeDuplicates(
    Object.entries(likeGroupWeirdObject).map((keyValue) => keyValue[1])
  );

  // FETCH DATING MATCHDATA DOC OF ALL PEOPLE LEFT
  // REMOVE THOSE THAT HAVE USER'S UID IN THEIR REPORTED USERS (here again above comment would be super useful)
  const matchDataDatingDocs = (
    await Promise.all(
      demographicPickedUids.map(async (uid_) => {
        return (await admin
          .firestore()
          .collection("matchData")
          .doc(uid_)
          .collection("pickingData")
          .doc("dating")
          .get()) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>;
      })
    )
  ).filter((doc) => doc.exists && !doc.data()?.reportedUsers[uid]?.exists);

  // SORT BASED ON SEARCH CRITERIA
  // deletes degree property as that would be unnecessary iteration as everyone already
  // matches the specified degree
  delete (searchCriteria as any).degree;
  let SCuids = searchCriteriaGrouping(matchDataDatingDocs, searchCriteria);

  // PICK ACCORDING TO NORMAL DISTRIBUTION AROUND PERFECT MATCH
  SCuids = pickFromSCArray(
    SCuids as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[],
    SCPickingVariance,
    numberOfSCPicks > SCuids.length ? SCuids.length : numberOfSCPicks
  ) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[];

  const SCGroupUsers = removeDuplicates(
    datingPickingToMap(
      uid,
      SCuids as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>[]
    )
  );

  // RETURN PICK
  const uidsPicked =
    randomWeightedPick(
      [SCGroupUsers, likeGroupUsers],
      [pickingWeights.searchCriteriaGroup, pickingWeights.likeGroup],
      numberOfPicks > SCGroupUsers.length + likeGroupUsers.length
        ? SCGroupUsers.length + likeGroupUsers.length
        : numberOfPicks
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return likeGroupSnapshot.docs
    .map((doc) => doc.ref.parent.parent?.id)
    .filter((id) => typeof id === "string") as string[];
}

function removeDuplicates(maps: uidChoiceMap[]): uidChoiceMap[] {
  return maps.filter(
    (map, index, self) => index === self.findIndex((t) => t.uid === map.uid)
  );
}
