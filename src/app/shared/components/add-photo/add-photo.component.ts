import {
  Component,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  Input,
  Renderer2,
} from "@angular/core";

import { Camera, CameraResultType } from "@capacitor/camera";

import { Capacitor } from "@capacitor/core";
import { ImageCropperComponent } from "@components/image-cropper/image-cropper.component";
import { ModalController, ModalOptions } from "@ionic/angular";

@Component({
  selector: "add-photo",
  // changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./add-photo.component.html",
  styleUrls: ["./add-photo.component.scss"],
})
export class AddPhotoComponent {
  @ViewChild("icon", { read: ElementRef, static: true }) icon: ElementRef;
  //@ViewChild("text", { read: ElementRef, static: true }) text: ElementRef;
  @ViewChild("view", { read: ElementRef, static: true }) view: ElementRef;

  @Output() onPhotoPicked = new EventEmitter<{ photoUrl: string; index: number }>();

  @Input() photoIndex: number;
  @Input() set photoDisplayedUrl(value: string) {
    if (!this.view || !this.icon /*|| !this.text*/) return;
    const view = this.view.nativeElement;
    const icon = this.icon.nativeElement;
    //const text = this.text.nativeElement;

    this.PreloadImage(value);

    // if new value of photodisplayed is empty, then that means look should be reverted back
    if (!value) {
      this.renderer.setStyle(view, "background", "var(--ion-color-light-tint)");
      this.renderer.setStyle(icon, "display", "inline");
    } else {
      this.renderer.setStyle(view, "background", `url(${value})`);
      this.renderer.setStyle(view, "backgroundSize", "cover");
      this.renderer.setStyle(icon, "display", "none");
    }
  }

  PreloadImage(src) {
    var img = new Image();

    // img.onload = function (a) {
    //   console.log("image has been loaded right now", a);
    // };
    img.src = src;
  }

  constructor(private renderer: Renderer2, private modalCtrl: ModalController) {}

  async pickPicture() {
    if (!Capacitor.isPluginAvailable("Camera")) {
      return console.error("Camera Capacitor plugin not available.");
    }

    // get image
    const photo = await Camera.getPhoto({
      quality: 50,
      // source: CameraSource.Prompt, // if this is uncommented (only tested for the value "CameraSource.Prompt"), it doesn't work on web nor ios. But commented out, it makes the app crash on ios but works on web
      correctOrientation: true,
      height: 300,
      width: 300,
      resultType: CameraResultType.Uri,
      allowEditing: true,
    });

    const blob = await (await fetch(photo.webPath)).blob();
    const url = URL.createObjectURL(blob);

    const croppedImageURL = await this.presentCropper(url);

    // send to parent component
    this.onPhotoPicked.emit({ photoUrl: croppedImageURL, index: this.photoIndex });
  }

  async presentCropper(url: string) {
    const modalOptions: ModalOptions = {
      component: ImageCropperComponent,
      componentProps: { imageURL: url }, // sending url to cropper
    };

    // creating and presenting modal
    const modal = await this.modalCtrl.create(modalOptions);
    await modal.present();

    // waiting for the model to be dismissed and obtaining the URL for the cropped image
    const { data } = await modal.onWillDismiss();
    const croppedImageURL: string = data.croppedImageURL;

    return croppedImageURL;
  }
}
