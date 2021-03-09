import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Gender, SexualPreference } from '@interfaces/index';
import { AuthResponseData } from '@interfaces/auth-response.model';
import { SignupRequired } from '@interfaces/signup.model';
import { IonSlides } from '@ionic/angular';
import { AngularAuthService } from '@services/login/auth/angular-auth.service';
import { Observable } from 'rxjs';
import { last } from 'rxjs/operators';
import { Router } from '@angular/router';

type requiredForm = FormGroup & { value: SignupRequired };

@Component({
  selector: 'app-signuprequired',
  templateUrl: './signuprequired.page.html',
  styleUrls: ['../welcome.page.scss']
})
export class SignuprequiredPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  requiredForm: requiredForm  = new FormGroup({
    firstName: new FormControl(null, [Validators.required, Validators.minLength(1)]),
    dateOfBirth: new FormControl(null, [Validators.required]),
    sexualPreference: new FormControl(null, [Validators.required]), 
    gender: new FormControl(null, [Validators.required]),
    // pictures: new FormControl(null),
    })

  constructor(private signUpAuthService: AngularAuthService, private router: Router) { }

  sexualPreferences: SexualPreference;
  gender: Gender

  ngOnInit() {
  }


  onSubmit() {
    console.log("Submitted form")
    const firstName: string = this.requiredForm.get('firstName').value
    const dateOfBirth: Date = new Date(this.requiredForm.get('dateOfBirth').value)
    const sexualPreference: SexualPreference = this.requiredForm.get('sexualPreference').value
    const gender: Gender = this.requiredForm.get('gender').value
    // const pictures: string = this.requiredForm.get('pictures').value

    console.log(firstName)    
    console.log(dateOfBirth)   
    console.log(sexualPreference)    
    console.log(gender)  
    if(!this.requiredForm.valid) {
      console.log("Form is not valid")
      return;
    }
    const university = "UCL" as const

    const myData: SignupRequired = {
      firstName: firstName,
      dateOfBirth: dateOfBirth.toISOString(),
      sexualPreference: sexualPreference,
      gender: gender,
    }
    const successful = this.signUpAuthService.createBaselineUser(myData)
    if (successful) {
      this.router.navigateByUrl('/welcome/signupoptional')
    }
    // this.router.navigateByUrl('welcome/signupoptional')    
  }

  goHome() {
    this.router.navigateByUrl('/main/tabs/home')
  }


}
