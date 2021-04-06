import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  Input,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CameraPhoto, Plugins } from "@capacitor/core";
const { CameraResultType, CameraSource, Capacitor } = Plugins;

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

  @Output() onPhotoPicked = new EventEmitter<{ photo: CameraPhoto; index: number }>();

  @Input() photoIndex: number;
  @Input() set photoDisplayed(value: CameraPhoto) {
    console.log("YOYO", value, this.view, this.icon, /*this.text*/);

    if (!this.view || !this.icon /*|| !this.text*/) return;
    const view = this.view.nativeElement;
    const icon = this.icon.nativeElement;
    //const text = this.text.nativeElement;

    // if new value of photodisplayed is empty, then that means look should be reverted back
    if (!value) {
      view.style.background = "var(--ion-color-light-tint)";
      icon.style.display = "inline";
      //text.style.display = "inline";
    } else {
      view.style.background = `url(${String(value.webPath)})`;
      view.style.backgroundSize = "cover";
      icon.style.display = "none";
      //text.style.display = "none";
    }
  }

  async pickPicture() {
    if (!Capacitor.isPluginAvailable("Camera")) {
      return console.error("Camera Capacitor plugin not available.");
    }

    // get image
    const photo = await Plugins.Camera.getPhoto({
      quality: 50,
      source: CameraSource.Prompt,
      correctOrientation: true,
      height: 300,
      width: 300,
      resultType: CameraResultType.Uri,
      allowEditing: true,
    });

    // send to parent component
    this.onPhotoPicked.emit({ photo, index: this.photoIndex });
  }
}
