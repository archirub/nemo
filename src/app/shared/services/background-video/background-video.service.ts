import { Injectable } from "@angular/core";
import { ReplaySubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class BackgroundVideoService {
  url: string = "/assets/welcome-background.mp4";

  fireOnLoad$ = new ReplaySubject<"">(1);

  constructor() {}

  loadVideo() {}
}
