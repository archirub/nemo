import { Component, Input, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Base64ToUrl } from "@stores/pictures/common-pictures-functions";
import { ImageCroppedEvent, LoadedImage } from "ngx-image-cropper";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-image-cropper",
  templateUrl: "./image-cropper.component.html",
  styleUrls: ["./image-cropper.component.scss"],
})
export class ImageCropperComponent implements OnInit {
  // original image coming in from wherever it is called
  @Input() imageURL: string = "";

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {}

  // some image change event, not useful in current system
  imageChangedEvent: any = "";

  // where the cropped image is held after each time "imageCropped()" is called (in base64 format)
  croppedImage: any = "";

  fileChangeEvent(event: any): void {
    console.log("fileChangeEvent");
    // // this.imageChangedEvent = event;
    // const file = event.srcElement.files[0];

    // this.imageURL = URL.createObjectURL(file);
    // console.log("imageURL", this.imageURL);
  }

  // This function gets called after every change to the cropping (whenever you release your click/finger)
  imageCropped(event: ImageCroppedEvent) {
    console.log("imageCropped");

    this.croppedImage = event.base64;
  }

  // to be called to dismiss the modal from which this component appeared, and send the cropped image
  async dismissCropper() {
    // transforming base64 format to URL
    const croppedImageURL = await firstValueFrom(Base64ToUrl(this.croppedImage));

    // sending data back to the component
    return this.modalCtrl.dismiss({ croppedImageURL });
  }

  // these functions below are of no use in the given scheme, but left just in case

  imageLoaded(image: LoadedImage) {
    console.log("imageLoaded");
    // show cropper
  }
  cropperReady() {
    console.log("cropperReady");
    // cropper ready
  }
  loadImageFailed() {
    console.log("loadImageFailed");
    // show message
  }
}
