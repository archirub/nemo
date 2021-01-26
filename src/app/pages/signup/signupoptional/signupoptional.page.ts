import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { SignupRequired } from '@interfaces/signup.model';
import { IonSlides } from '@ionic/angular';

type optionalForm = FormGroup & { value: SignupRequired };

@Component({
  selector: 'app-signupoptional',
  templateUrl: './signupoptional.page.html',
  styleUrls: ['../signup.page.scss'],
})
export class SignupoptionalPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  optionalForm: optionalForm = new FormGroup({
    biography: new FormControl(null),
    course: new FormControl(null),
    society: new FormControl(null),
    areaOfStudy: new FormControl(null),
    societyCategory: new FormControl(null),
    interests: new FormControl(null),
    questions: new FormControl(null),
    location: new FormControl(null)})

  constructor() { }

  ngOnInit() {
  }
  
  item = {
    checked: false,
  };

}
