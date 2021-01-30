import { Component, Input, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CameraResultType, CameraSource, Capacitor, Plugins } from "@capacitor/core";

@Component({
    selector: "add-photo",
    templateUrl: "./add-photo.component.html",
    styleUrls: ["./add-photo.component.scss"],
})

export class AddPhotoComponent implements OnInit {
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

            // Here, change image styling by getElementById example
            // Has to be done here, where 'image' only remains in the local scope
            // Once the photo is saved to the database it needs to be pulled and formatted here
            // There may be another way but this is what makes sense to me (Ewan)
            // Currently only changes first photobox
            console.log("Styling...");
            var photo = document.getElementById("photo-box");
            photo.style.background = `url(${String(imageUrl)})`;
            photo.style.backgroundSize = 'contain';
            for (let i = 0; i < photo.children.length; i++) {
                var current = photo.childNodes[i];
                photo.removeChild(current);
            };

            // I tried to get the above to work with ViewChild decorator, but no matter what I did the
            // selector returned undefined, even when I specified it was an HTMLElement and changed it
            // from OnInit to AfterViewInit/AfterViewChecked
            // You guys are far better at this than I am though so I trust you'll figure it out
        });
      }
}