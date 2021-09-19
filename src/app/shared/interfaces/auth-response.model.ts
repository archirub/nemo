import { allowOptionalProp } from "./shared.model";
import { SignupOptional, SignupRequired } from "./signup.model";

export type signupDataHolder =
  // SignupAuthenticated &
  allowOptionalProp<SignupRequired> & allowOptionalProp<SignupOptional>;
// no need for properties from signupAuthenticated in there as that data is already in
// the Firebase Auth system (i.e. the email and the uid are, I don't see the use for the token)
