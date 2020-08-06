import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { NavController } from "@ionic/angular";

interface Tab {
  name: string;
  icon: string;
}

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.component.html",
  styleUrls: ["./tab-menu.component.scss"],
})
export class TabMenuComponent implements OnInit {
  tabs: Tab[];

  constructor(private router: Router, private navCtrl: NavController) {}

  ngOnInit() {
    // Order is very important in the tabs object, as it defines the
    // Position of each tab with regards to one another in the view and in the onChangePage method.
    this.tabs = [
      {
        name: "chats",
        icon: "chatbubble-outline",
      },
      {
        name: "home",
        icon: "logo-react",
      },
      {
        name: "own-profile",
        icon: "person-outline",
      },
    ];
  }

  onClickedPage(pageName: string): void {
    const indexFrom = this.findIndex(
      this.tabs,
      "name",
      this.router.url.replace("/", "")
    );
    const indexTo = this.findIndex(this.tabs, "name", pageName);
    const indexDifference = indexFrom - indexTo;

    //Do nothing in case where the tab that was clicked is the current tab
    if (indexDifference === 0) return;

    const animationDirection = () => {
      if (indexDifference > 0) {
        return "back";
      }
      return "forward";
    };

    //Sets animation direction
    this.navCtrl.setDirection(animationDirection());

    //Navigates to page
    this.router.navigateByUrl(pageName);
  }

  //returns the index of the element whose attribute 'attr' has value 'value' in array
  private findIndex(array: Tab[], attr: string, value: string): number {
    for (var i = 0; i < array.length; i += 1) {
      if (array[i][attr] === value) {
        return i;
      }
    }
    return -1;
  }
}
