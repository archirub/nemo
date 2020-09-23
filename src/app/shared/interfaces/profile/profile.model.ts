export interface profile {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  pictures: userPictures;
  biography: string;
  socialFeatures: socialFeatures;
  matches: IDarray;
  hasMatchDocument: boolean; // Helps in match-generator to find profiles with no match document
}

export interface socialFeatures {
  university: string;
  course: string;
  societies: societies;
}

export interface societies {
  [society: string]: true;
}

export type IDarray = string[];

export interface IDmap {
  [userID: string]: true;
}

// users must have between 1 and 5 pictures
export interface userPictures {
  0: string;
  [propName: number]: string;
}

export interface profileObject {
  ID: string;
  profileSnapshot: profileSnapshot;
}

export type profileSnapshot = firebase.firestore.QueryDocumentSnapshot<
  firebase.firestore.DocumentData
>;
