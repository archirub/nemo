// import { GlobalErrorHandler } from "./shared/error-handling/global-error-handling";
import { ErrorHandler, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy } from "@ionic/angular";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";

import { AngularFireModule } from "@angular/fire";
import { AngularFirestoreModule } from "@angular/fire/firestore";
import { AngularFireFunctionsModule, REGION } from "@angular/fire/functions";
import { AngularFireStorageModule } from "@angular/fire/storage";

import { environment } from "src/environments/environment";

import { pageTransition } from "./shared/animations/page-transition.animation";
import { PipesModule } from "@pipes/pipes.module";
import { DirectivesModule } from "./shared/directives/directives.module";
import { SortablejsModule } from "ngx-sortablejs";

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    IonicModule.forRoot({ navAnimation: pageTransition }),
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireFunctionsModule,
    AngularFireStorageModule,
    PipesModule,
    DirectivesModule,
    SortablejsModule.forRoot({}),
  ],
  providers: [
    StatusBar,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: REGION, useValue: "europe-west2" },
    // {
    //   // processes all errors
    //   provide: ErrorHandler,
    //   useClass: GlobalErrorHandler,
    // },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
