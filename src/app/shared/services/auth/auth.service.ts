import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  public signedIn: Observable<Boolean>;

  constructor(private fs: AngularFirestore, private auth: AngularFireAuth) {
    // this.signedIn = new Observable((subscriber) => {
    //   this.auth.onAuthStateChanged(subscriber);
    // });
    // BELOW IS FOR FOR DEVELOPMENT, UNCOMMENT THE ABOVE FOR NORMAL AUTH
    this.signedIn = new Observable((subscriber) => subscriber.next(true));
  }

  async signIn(email: string, password: string) {
    if (!email || !password) return;
    try {
      await this.auth.signInWithEmailAndPassword(email, password);
      return true;
    } catch (error) {
      console.log("Sign in failed", error);
      return false;
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
      return true;
    } catch (error) {
      console.log("Sign out failed", error);
      return false;
    }
  }

  getUserID(): string | null {
    let userID = null;
    this.auth.currentUser.then((value) => (userID = value));
    return userID;
  }
}
