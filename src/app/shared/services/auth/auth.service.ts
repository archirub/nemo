import { Injectable, OnDestroy } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { BehaviorSubject, Observable, Subscription } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService implements OnDestroy {
  private _userID: string = "oY6HiUHmUvcKbFQQnb88t3U4Zew1";
  private _isAuthenticated = new BehaviorSubject<Boolean>(null);

  private isAuthenticated$: Subscription;

  public isAuthenticated: Observable<Boolean> = this._isAuthenticated.asObservable();

  public get userID(): string {
    return this._userID;
  }

  public set userID(v: string) {
    this._userID = v;
  }

  constructor(private fs: AngularFirestore, private afAuth: AngularFireAuth) {
    // this._signedIn.next()

    this.isAuthenticated$ = this.afAuth.authState.subscribe((user) => {
      if (user) {
        this._isAuthenticated.next(true);
      } else {
        this._isAuthenticated.next(false);
      }
    });
  }

  async logIn() {
    // BELOW IS FOR FOR DEVELOPMENT,
    await this.afAuth.signInWithEmailAndPassword(
      "archibald.ruban@gmail.com",
      "1q2w3e4r5t6y7u8i9o0p"
    );
    const user = await this.afAuth.currentUser;
    console.log("ID of logged in user:", user.uid);
    this.userID = user.uid;
  }

  async signIn(email: string, password: string) {
    if (!email || !password) return;
    try {
      await this.afAuth.signInWithEmailAndPassword(email, password);

      return true;
    } catch (error) {
      console.log("Sign in failed", error);
      return false;
    }
  }

  async signOut() {
    try {
      await this.afAuth.signOut();
      return true;
    } catch (error) {
      console.log("Sign out failed", error);
      return false;
    }
  }

  async fetchUserID(): Promise<string> {
    const user: firebase.User = await this.afAuth.currentUser;
    this.userID = user.uid;
    return user.uid;
  }

  ngOnDestroy() {
    this.isAuthenticated$.unsubscribe();
  }
}
