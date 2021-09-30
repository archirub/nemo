import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  Input,
  ChangeDetectionStrategy,
  Renderer2,
} from "@angular/core";

import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

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

  constructor(private renderer: Renderer2) {}

  async pickPicture() {
    if (!Capacitor.isPluginAvailable("Camera")) {
      return console.error("Camera Capacitor plugin not available.");
    }

    // get image
    const photo = await Camera.getPhoto({
      quality: 50,
      source: CameraSource.Prompt,
      correctOrientation: true,
      height: 300,
      width: 300,
      resultType: CameraResultType.Uri,
      allowEditing: true,
    });

    const blob = await (await fetch(photo.webPath)).blob();
    const url = URL.createObjectURL(blob);

    // send to parent component
    this.onPhotoPicked.emit({ photoUrl: url, index: this.photoIndex });
  }
}
