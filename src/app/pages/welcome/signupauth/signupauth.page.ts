import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthResponseData } from '@interfaces/auth-response.model';
import { AlertController } from '@ionic/angular';
import { AngularAuthService } from '@services/login/auth/angular-auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-signupauth',
  templateUrl: './signupauth.page.html',
  styleUrls: ['../welcome.page.scss'],
})
export class SignupauthPage implements OnInit {

  authForm = new FormGroup({
    email: new FormControl('',[Validators.required, Validators.email, Validators.pattern('[a-zA-Z]*@[a-zA-Z]*\.ac\.uk')]),
    password: new FormControl('',[Validators.required, Validators.min(8)])})


  constructor(private signUpAuthService: AngularAuthService, private alertCtrl: AlertController) { }

  ngOnInit() {
  }

  onSubmit() {
    console.log("Submitted form")
    if(!this.authForm.valid) {
      console.log("Form is not valid")
      return;
    }
    let authObs: Observable<AuthResponseData>;

    const email: string = this.authForm.get('email').value
    const password: string = this.authForm.get('password').value
    console.log(this.authForm.get('email').value)
    console.log(this.authForm.get('password').value)
    authObs = this.signUpAuthService.signup(email, password)
    
    // centralize the subscribe/error handling method so there is an if statement for each potential code
    authObs.subscribe(
      resData => console.log(resData), 
      errRes => {
        const code = errRes.error.error.message;
        let message = "Could not sign you up. Please try again later."
        if (code === "EMAIL_EXISTS") {
          let message = 'The email address is already in use by another account.'}
        if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          let message = 'We have blocked all requests from this device due to unusual activity. Try again later.'}
        this.showAlert(message)
      }
    )
  }

  private showAlert(message: string) {
    this.alertCtrl.create({
      header: 'Signup Failed',
      message: message,
      buttons: ['Okay']
    }).then(alertEl => alertEl.present())
  } 


}
