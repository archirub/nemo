import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";

export const MatchesEnterAnimation = (
  matchesButton: ElementRef<any>,
  tabComponent: ElementRef<any>,
  chatComponent: ElementRef<any>,
  screenHeight: number,
  screenWidth: number
) => {
  const buttonXPosition = matchesButton.nativeElement.getBoundingClientRect().x;
  const buttonYPosition = matchesButton.nativeElement.getBoundingClientRect().y;
  const buttonWidth = matchesButton.nativeElement.getBoundingClientRect().width;
  const buttonHeight = matchesButton.nativeElement.getBoundingClientRect().height;

  const startingHorizontalPosition = buttonXPosition - screenWidth / 2 + buttonWidth / 2;
  const startingVerticalPosition = buttonYPosition - screenHeight / 2 + buttonHeight / 2;

  const animation = (baseEl: any) => {
    // MODAL
    const wrapperAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-wrapper")!)
      .beforeStyles({
        height: "90vh",
        width: "90vw",
        overflow: "scroll",
        "--overflow": "scroll",
        background: "transparent",
        opacity: "1",
      })
      .fromTo("transform", "translateY(-100vh)", "translateY(0vh)");

    // SHADOW IOS
    const shadowIOSAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-shadow")!)
      .fromTo("background", "transparent", "var(--ion-color-dark)")
      .fromTo("opacity", "0", "0.2");

    // SHADOW ANDROID
    const shadowAndroidAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".sc-ion-modal-md")!)
      .fromTo("background", "transparent", "var(--ion-color-dark)")
      .fromTo("opacity", "0", "0.2");

    // ALL CONTENT BELOW MODAL
    const contentAnimation = new AnimationController()
      .create()
      .addElement(chatComponent.nativeElement)
      .addElement(tabComponent.nativeElement)
      .fromTo("filter", "blur(0px)", "blur(20px)");

    // BACKDROP
    const backdropAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector("ion-backdrop"))
      .fromTo("opacity", "0.01", "var(--backdrop-opacity)")
      .fromTo("backdropFilter", "blur(0px) opacity(1)", "blur(100px) opacity(0)");

    return new AnimationController()
      .create()
      .addElement(baseEl)
      .easing("ease-out")
      .duration(200)
      .addAnimation([
        backdropAnimation,
        shadowIOSAnimation,
        shadowAndroidAnimation,
        wrapperAnimation,
        contentAnimation,
      ]);
  };
  return animation;
};

export const MatchesLeaveAnimation = (
  searchButton: ElementRef<any>,
  tabComponent: ElementRef<any>,
  chatComponent: ElementRef<any>,
  screenWidth: number,
  screenHeight: number
) => {
  const animation = (baseEl) => {
    return MatchesEnterAnimation(
      searchButton,
      tabComponent,
      chatComponent,
      screenWidth,
      screenHeight
    )(baseEl).direction("reverse");
  };
  return animation;
};
