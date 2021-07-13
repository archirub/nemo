import { allowOptionalProp } from "./shared.model";
import { SignupOptional, SignupRequired, SignupAuthenticated } from "./signup.model";

export interface AuthResponseData {
  kind: string;
  idToken: string;
  email: string;
  refreshToken: string;
  localId: string;
  expiresIn: string;
  registered?: boolean;
}

export type signupDataHolder =
  // SignupAuthenticated &
  allowOptionalProp<SignupRequired> & allowOptionalProp<SignupOptional>;
// no need for properties from signupAuthenticated in there as that data is already in
// the Firebase Auth system (i.e. the email and the uid are, I don't see the use for the token)
