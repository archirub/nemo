import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const IntEnterAnimation = (
  tabComponent: ElementRef<any>,
  pageComponent: ElementRef<any>
) => {
  const animation = (baseEl: any) => {
    // MODAL
    const wrapperAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-wrapper")!)
      .duration(350)
      .easing("ease-in-out")
      .beforeStyles({
        height: "90vh",
        width: "90vw",
        "--border-radius": "20px",
        opacity: "1",
        overflow: "inherit",
      })
      .fromTo("transform", "translate3d(0,100%,0)", "translate3d(0,0,0)");

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
      .addElement(pageComponent.nativeElement)
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

export const IntLeaveAnimation = (
  tabComponent: ElementRef<any>,
  pageComponent: ElementRef<any>
) => {
  const animation = (baseEl) => {
    return IntEnterAnimation(tabComponent, pageComponent)(baseEl).direction("reverse");
  };
  return animation;
};
