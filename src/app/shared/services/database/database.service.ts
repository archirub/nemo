import { Injectable, OnDestroy } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { Subscription } from "rxjs";

import { AuthService } from "@services/auth/auth.service";
import { NameService } from "@services/name/name.service";

@Injectable({
  providedIn: "root",
})
export class DatabaseService implements OnDestroy {
  userID$: Subscription;

  constructor(
    private firestore: AngularFirestore,
    private name: NameService,
    private auth: AuthService
  ) {}

  async isLikedBy(userID: string): Promise<Boolean> {
    if (!userID) {
      console.error("No user ID provided.");
      return;
    }
    let myID: string = "";
    this.userID$ = this.auth.userID.subscribe({
      next: (ID) => (myID = ID),
    });
    const snapshot = await this.firestore
      .collection(this.name.matchCollection)
      .doc(userID)
      .get()
      .toPromise();
    if (!snapshot.exists) return false;
    const likedUsers: string[] = snapshot.data().likedUsers;
    if (likedUsers.includes(myID)) {
      return true;
    }
    return false;
  }

  ngOnDestroy() {
    this.userID$.unsubscribe();
  }
}
