import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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

interface requestData {
  ID: string;
  searchCriteria: searchCriteria;
}
interface searchCriteria {
  [criterion: string]: string;
}

export const generateSwipeStack = functions
  .region("europe-west2")
  .https.onCall(async (data: requestData, context) => {
    // .https.onRequest(async (request, response) => {

    // DATA FROM REQUEST
    const targetID: string = data.ID;
    const searchCriteria: searchCriteria = data.searchCriteria;

    // INDEPENDENT PARAMETERS
    const maxPI: number = 1;
    const minPI: number = 0;
    const profilesPerWave: number = 20;
    const PIprofilesToFetch: number = 50;
    const weights = {
      likeGroup: 0.2,
      SearchCriteriaGroup: {
        all: 0.8,
        perfectMatch: 0.5,
        partialMatch: 0.3,
        noMatch: 0.2,
      },
    };

    // DEPENDENT PARAMETERS
    const averagePI: number = (maxPI + minPI) / 2;
    const likeGroupCount: number = profilesPerWave * weights.likeGroup;
    const perfectMatchCount: number =
      profilesPerWave *
      weights.SearchCriteriaGroup.all *
      weights.SearchCriteriaGroup.perfectMatch;
    const partialMatchCount: number =
      profilesPerWave *
      weights.SearchCriteriaGroup.all *
      weights.SearchCriteriaGroup.partialMatch;
    const noMatchCount: number =
      profilesPerWave *
      weights.SearchCriteriaGroup.all *
      weights.SearchCriteriaGroup.noMatch;

    // COLLECTION REFERENCES
    const matchDataCollection = admin.firestore().collection("matchData");

    // FETCHING DATA FROM TARGETED USER
    const targetData = await matchDataCollection.doc(targetID).get();

    // ASSIGNING DEFAULT VALUES
    let targetPI: number = averagePI;
    let bannedUsers: string[] = [];

    // ASSIGNING REAL VALUES
    if (targetData.exists) {
      const data = targetData.data() as FirebaseFirestore.DocumentData;
      targetPI = data.PI;
      bannedUsers = [
        ...new Set(
          ...(data.bannedUsers as string[]),
          ...(data.matches as string[])
        ),
      ]; // In case all matchedUsers aren't in banned users array
    }

    // FETCHING PROFILE GROUPS
    let PiGroup_matchData: FirebaseFirestore.QueryDocumentSnapshot<
      FirebaseFirestore.DocumentData
    >[] = await fetchPIGroup(targetPI, averagePI, PIprofilesToFetch);
    let likeGroup_matchData = await fetchLikeGroup(targetID);

    // REMOVING BANNED USERS
    PiGroup_matchData = PiGroup_matchData.filter(
      (profile) => !bannedUsers.includes(profile.id)
    );
    likeGroup_matchData = likeGroup_matchData.filter(
      (profile) => !bannedUsers.includes(profile.id)
    );

    // SEPARATING PI GROUP INTO SEARCH CRITERIA MATCH-DEGREE CATEGORIES
    const separatedProfiles = separateBasedOnSearchCriteria(
      PiGroup_matchData,
      searchCriteria
    );
    let perfectMatches = separatedProfiles.perfectMatches;
    let partialMatches = separatedProfiles.partialMatches;
    let noMatches = separatedProfiles.noMatches;

    // CONVERTING PROFILE ARRAYS TO ID ARRAYS
    const perfectMatchIDs = matchDataToIDs(perfectMatches);
    const partialMatchIDs = matchDataToIDs(partialMatches);
    const noMatchIDs = matchDataToIDs(noMatches);
    const likeGroupIDs = matchDataToIDs(likeGroup_matchData);

    // PICKING
    const pickedIDs: string[] | undefined = getRandomPicks<string>(
      [perfectMatchIDs, partialMatchIDs, noMatchIDs, likeGroupIDs],
      [perfectMatchCount, partialMatchCount, noMatchCount, likeGroupCount],
      profilesPerWave
    );

    // SENDING RESPONSE
    // response.send({ IDs: pickedIDs });
    return { IDs: pickedIDs };
  });

/**
 * Returns a random sampler for the discrete probability distribution
 * defined by the given array
 * @param inputProbabilities The array of input probabilities to use.
 *   The array's values must be Numbers, but can be of any magnitude
 * @returns A function with no arguments that, when called, returns
 *   a number between 0 and inputProbabilities.length with respect to
 *   the weights given by inputProbabilities.
 */
export function aliasSampler(inputProbabilities: number[]) {
  let probabilities: number[], aliases: number[];

  // First copy and type-check the input probabilities,
  // also taking their sum.
  probabilities = inputProbabilities.map((probability, index) => {
    if (Number.isNaN(Number(probability))) {
      throw new TypeError(
        "Non-numerical value in distribution at index " + index
      );
    }
    return Number(probability);
  });
  const probsum = inputProbabilities.reduce(function (sum, p) {
    return sum + p;
  }, 0);

  // Scale all of the probabilities such that their average is 1
  // (i.e. if all of the input probabilities are the same, then they
  // are all set to 1 by this procedure)
  const probMultiplier = inputProbabilities.length / probsum;
  probabilities = probabilities.map(function (p, i) {
    return p * probMultiplier;
  });

  // Sort the probabilities into overFull and underFull queues
  let overFull: number[] = [],
    underFull: number[] = [];
  probabilities.forEach((probability, index) => {
    if (probability > 1) overFull.push(index);
    else if (probability < 1) underFull.push(index);
    else if (probability !== 1) {
      throw new Error(
        "User program has disrupted JavaScript defaults " +
          "and prevented this function from executing correctly."
      );
    }
  });

  // Construct the alias table.
  // In each iteration, the remaining space in an underfull cell
  // will be filled by surplus space from an overfull cell, such
  // that the underfull cell becomes exactly full.
  // The overfull cell will then be reclassified as to how much
  // probability it has left.
  aliases = [];
  while (overFull.length > 0 || underFull.length > 0) {
    if (overFull.length > 0 && underFull.length > 0) {
      aliases[underFull[0]] = overFull[0];
      probabilities[overFull[0]] += probabilities[underFull[0]] - 1;
      underFull.shift();
      if (probabilities[overFull[0]] > 1)
        overFull.push(overFull.shift() as number);
      else if (probabilities[overFull[0]] < 1)
        underFull.push(overFull.shift() as number);
      else overFull.shift();
    } else {
      // Because the average of all the probabilities is 1, mathematically speaking,
      // this block should never be reached. However, because of rounding errors
      // posed by floating-point numbers, a tiny bit of surplus can be left over.
      // The error is typically neglegible enough to ignore.
      const notEmptyArray = overFull.length > 0 ? overFull : underFull;
      notEmptyArray.forEach(function (index) {
        probabilities[index] = 1;
      });
      notEmptyArray.length = 0;
    }
  }

  // Finally, create and return the sampler. With the creation of the alias table,
  // each box now represents a biased coin whose possibilities are either it or
  // its corresponding alias (the overfull cell it took from). The sampler picks
  // one of these coins with equal probability for each, then flips it and returns
  // the result.
  // return function sample() {
  const index = Math.floor(Math.random() * probabilities.length);
  return Math.random() < probabilities[index] ? index : aliases[index];
  // };
}

function getRandomPicks<T>(
  groups: T[][] | undefined,
  weightings: number[] | undefined,
  pickCount: number | undefined
): Array<T> | undefined {
  if (!groups || !weightings || !pickCount) return;
  if (groups.length !== weightings.length) return;

  const itemsPicked: T[] = [];
  const itemCount: number = groups
    .map((group) => group.length)
    .reduce((a, b) => a + b, 0);

  // Condition of this format is necessary for the loop to not run
  // indefinitely if the total # of items is lower than
  // the desired # of picks.
  const desiredLength: number = Math.min(itemCount, pickCount);
  while (itemsPicked.length < desiredLength) {
    const indexPicked: number = aliasSampler(weightings);
    const groupPicked: T[] = groups[indexPicked];
    const pick: T = groupPicked[Math.floor(Math.random() * groupPicked.length)];

    // appends to array if not yet in array and pick isn't null
    if (pick) {
      itemsPicked.indexOf(pick) === -1 && itemsPicked.push(pick);
    }

    // removing item from the group to reduce unnecessary loops
    groupPicked.filter((item) => item !== pick);
  }

  return itemsPicked;
}

function matchDataToIDs(
  matchDataDocs: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[]
): string[] {
  if (!matchDataDocs) return [];

  const IDarray: string[] = [];

  matchDataDocs.forEach((doc) => {
    IDarray.push(doc.id);
  });

  return IDarray;
}

/**
 *
 * @param profiles
 * @param searchCriteria
 * @returns three lists of IDs, each corresponding to a different degree of match
 * of the target user's search criteria.
 */
function separateBasedOnSearchCriteria(
  profiles: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[],
  searchCriteria: {
    [criterion: string]: string;
  }
): {
  [degreeOfMatch: string]: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[];
} {
  const perfectMatches: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[] = [];
  const partialMatches: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[] = [];
  const noMatches: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[] = [];

  const loopableSearchCriteria = Object.entries(searchCriteria);

  for (const profile of profiles) {
    let didMatchCounter = 0;
    let didNotMatchCounter = 0;

    for (const [criterion, value] of loopableSearchCriteria) {
      if (profile.data()["searchFeatures"][criterion] === value) {
        didMatchCounter++;
      } else {
        didNotMatchCounter++;
      }
    }

    if (didNotMatchCounter === 0) {
      perfectMatches.push(profile);
    } else if (didMatchCounter === 0) {
      noMatches.push(profile);
    } else {
      partialMatches.push(profile);
    }
  }

  return {
    perfectMatches: perfectMatches,
    partialMatches: partialMatches,
    noMatches: noMatches,
  };
}

async function fetchLikeGroup(
  targetID: string
): Promise<
  FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
> {
  const matchDataCollection = admin.firestore().collection("matchData");

  const likeGroupSnapshot = await matchDataCollection
    .where("lkedUsers", "array-contains", targetID)
    .get();

  return likeGroupSnapshot.docs;
}

async function fetchPIGroup(
  targetPI: number,
  averagePI: number,
  userCount: number
): Promise<
  FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
> {
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
