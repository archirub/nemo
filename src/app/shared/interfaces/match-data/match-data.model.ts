import { socialFeatures, IDarray } from "../profile";

export interface matchObject {
  userID: string;
  PI: number;
  socialFeatures: socialFeatures;
  physicalFeatures: physicalFeatures;
  bannedUsers: IDarray;
  likedUsers: IDarray;
}

export interface physicalFeatures {
  height: string;
  hairColor: string;
  skinTone: string;
}
