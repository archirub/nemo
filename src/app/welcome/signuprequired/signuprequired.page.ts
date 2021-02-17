import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { SignupRequired } from '@interfaces/signup.model';
import { IonSlides } from '@ionic/angular';
import { AngularAuthService } from '@services/login/auth/angular-auth.service';
import { last } from 'rxjs/operators';

type requiredForm = FormGroup & { value: SignupRequired };

@Component({
  selector: 'app-signuprequired',
  templateUrl: './signuprequired.page.html',
  styleUrls: ['../welcome.page.scss']
})
export class SignuprequiredPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  requiredForm: requiredForm  = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    dateOfBirth: new FormControl(null),
    pictures: new FormControl(null),
    })

  constructor(private signUpAuthService: AngularAuthService) { }

  ngOnInit() {
  }


  onSubmit() {
    console.log("Submitted form")
    if(!this.requiredForm.valid) {
      console.log("Form is not valid")
      return;
    }
    const firstName: string = this.requiredForm.get('firstName').value
    const lastName: string = this.requiredForm.get('lastName').value
    const dateOfBirth: Date = new Date(this.requiredForm.get('dateOfBirth').value)
    console.log(firstName)    
    console.log(lastName)    
    console.log(dateOfBirth)   
    // const myData: SignupRequired = {
    //   firstName: firstName,
    //   lastName: lastName,
    //   dateOfBirth: dateOfBirth,
    //   sexualPreference: }

    // this.signUpAuthService.createPartialUser()
    
  }

}
