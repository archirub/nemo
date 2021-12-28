import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TutorialsService {

  private tutorialSubject = new BehaviorSubject<Record<string, boolean>>({
    'home': true,
    'own-profile': true,
    'chats': true
  });

  constructor() {}

  finishTutorials(tutorial: string): void {
    let newValue = {...this.tutorialSubject.value};
    newValue[tutorial] = false;
    this.tutorialSubject.next(newValue);
  }

  checkTutorials(): BehaviorSubject<any> {
    return this.tutorialSubject;
  }
}
