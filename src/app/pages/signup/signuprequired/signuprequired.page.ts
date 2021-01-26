import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { SignupRequired } from '@interfaces/signup.model';
import { IonSlides } from '@ionic/angular';


type requiredForm = FormGroup & { value: SignupRequired };

@Component({
  selector: 'app-signuprequired',
  templateUrl: './signuprequired.page.html',
  styleUrls: ['../signup.page.scss'],
})
export class SignuprequiredPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  requiredForm: requiredForm  = new FormGroup({
    firstNamee: new FormControl(null),
    lastName: new FormControl(null),
    dateOfBirth: new FormControl(null),
    pictures: new FormControl(null),
    university: new FormControl(null)})

  constructor() { }

  ngOnInit() {
  }

}
