import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'own-profile-tutorial-slides',
  templateUrl: './own-profile-tutorial.component.html',
  styleUrls: ['./own-profile-tutorial.component.scss'],
})
export class OwnProfileTutorialComponent implements OnInit {
  @Output() exit = new EventEmitter();

  constructor() { }

  ngOnInit() {}

  exitOwnProfileTutorial() {
    this.exit.emit('true');
  }
}
