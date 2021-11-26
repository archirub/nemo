import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'home-tutorial-slides',
  templateUrl: './home-tutorial.component.html',
  styleUrls: ['./home-tutorial.component.scss'],
})
export class HomeTutorialComponent implements OnInit {
  @Output() exit = new EventEmitter();

  constructor() { }

  ngOnInit() {}

  exitHomeTutorial() {
    this.exit.emit('true');
  }

}
