import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { Profile } from '@classes/index';
import { User } from '@classes/user.class';
import { profileFromDatabase } from '@interfaces/index';
import { FormatService } from '@services/index';
import { SearchCriteriaStore } from '@stores/search-criteria-store/search-criteria-store.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecentMatchesStore {
  private _match: BehaviorSubject<User>;
  public readonly match: Observable<User>;

  constructor(
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private format: FormatService,
    private SCstore: SearchCriteriaStore
  ) {
    this._match = new BehaviorSubject<User>(null);
    this.match = this._match.asObservable();
  }

  async fetchProfile(uid: string): Promise<Profile> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    const query = this.fs.firestore.collection("profiles").doc(uid);
    const snapshot = await query.get();
    if (snapshot.exists) {
      const data = snapshot.data() as profileFromDatabase;
      return this.format.profileDatabaseToClass(snapshot.id, data);
    }
    console.error("No document found from profile query");
  }

}
