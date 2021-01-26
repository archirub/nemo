import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { signupAuth } from '@interfaces/signup.model';
import { IonSlides } from '@ionic/angular';

type authForm = FormGroup & { value: signupAuth };

@Component({
  selector: 'app-signupauth',
  templateUrl: './signupauth.page.html',
  styleUrls: ['../signup.page.scss'],
})
export class SignupauthPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  authForm: authForm = new FormGroup({
    email: new FormControl(null),
    password: new FormControl(null)})

  constructor() { }

  ngOnInit() {
  }

}
