import { Component, Input, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CameraResultType, CameraSource, Capacitor, Plugins } from "@capacitor/core";

@Component({
    selector: "add-photo",
    templateUrl: "./add-photo.component.html",
    styleUrls: ["./add-photo.component.scss"],
})

export class AddPhotoComponent implements OnInit {
    @ViewChild('icon', { read: ElementRef }) icon: ElementRef;
    @ViewChild('text', {read: ElementRef }) text: ElementRef;
    @ViewChild('view', { read: ElementRef }) view: ElementRef;

    constructor() {}

    ngOnInit() {}

    //Shamelessly stolen from signup.page.ts
    onPickPicture() {
        if (!Capacitor.isPluginAvailable("Camera")) {
          return;
        }
        Plugins.Camera.getPhoto({
          quality: 50,
          source: CameraSource.Prompt,
          correctOrientation: true,
          height: 300,
          width: 300,
          resultType: CameraResultType.Uri, //changed from Base64
          allowEditing: true,
        }).then((image) => {
            var imageUrl = image.webPath;
            console.log(String(imageUrl));

            console.log("Styling...");
            var photo = this.view.nativeElement;
            var icon = this.icon.nativeElement;
            var text = this.text.nativeElement;
            photo.style.background = `url(${String(imageUrl)})`;
            photo.style.backgroundSize = 'cover';
            icon.style.display = 'none';
            text.style.display = 'none';
        });
    }
}