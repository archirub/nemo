import { ErrorHandler, Injectable } from "@angular/core";
import { FirebaseError } from "@firebase/util";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor() {}

  handleError(error: any) {
    // Check if it's an error from an HTTP response
    // if (!(error instanceof HttpErrorResponse)) {
    //   error = error.rejection; // get the error object
    // }
    // this.zone.run(() =>
    //   this.errorDialogService.openDialog(
    //     error?.message || 'Undefined client error',
    //     error?.status
    //   )
    // );

    if (error instanceof FirebaseError) {
      console.error(
        "FIREBASE ERROR: " +
          (error as FirebaseError).code +
          "   " +
          (error as FirebaseError).name
      );
    } else {
      console.error("NOT FIREBASE:", error);
    }
  }
}
