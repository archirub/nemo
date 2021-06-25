import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

interface picturesHolder {
  [uid: string]: string[];
}

@Injectable({
  providedIn: "root",
})
export class OthersPicturesService {
  private holder = new BehaviorSubject<picturesHolder>({});
  holder$ = this.holder.asObservable();

  constructor() {}

  addUserPictures(
    uid: string,
    pictures: string[]
  ): Observable<{ uid: string; pictures: string[] }> {
    return this.holder$.pipe(
      tap((holder) => {
        holder[uid] = pictures;
        this.holder.next(holder);
      }),
      map(() => {
        return { uid, pictures };
      })
    );
  }

  removeUserPictures(uid: string): Observable<string> {
    return this.holder$.pipe(
      tap((holder) => {
        const pictures = holder[uid];
        if (pictures && Array.isArray(pictures)) {
          this.revokeUrls(pictures);
        }
        delete holder[uid];
        this.holder.next(holder);
      }),
      map(() => {
        return uid;
      })
    );
  }

  revokeUrls(pictures: string[]): void {
    pictures.forEach((url) => {
      URL.revokeObjectURL(url);
    });
  }
}
