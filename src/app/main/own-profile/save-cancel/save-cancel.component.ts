import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';

@Component({
  selector: 'save-cancel',
  templateUrl: './save-cancel.component.html',
  styleUrls: ['./save-cancel.component.scss'],
})
export class SaveCancelComponent extends EventEmitter implements OnInit {
  @Input() buttonWidth: number = 20;
  @Output() valueChange = new EventEmitter();
  
  value: string;

  constructor() {
    super();
  }

  ngOnInit() {}

  setValue(val) {
    this.value = val;
    this.valueChange.emit(this.value);
  }
}
