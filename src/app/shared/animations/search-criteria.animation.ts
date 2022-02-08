import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SCenterAnimation = () => {
  const animation = (baseEl: any) => {
    // MODAL
    // const wrapperAnimation = new AnimationController()
    //   .create()
    //   .addElement(baseEl.querySelector(".modal-wrapper")!)
    //   .duration(0)
    //   .beforeStyles({
    //     height: "90vh",
    //     width: "90vw",
    //     "--border-radius": "20px",
    //     "border-radius": "20px",
    //     // opacity: "1",
    //     overflow: "inherit",
    //   })
    //   .fromTo("transform", "translateY(-100vh)", "translateY(0vh)");

    const anim2 = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-wrapper")!)
      .duration(200)
      .easing("cubic-bezier(0.5, 1, 0.89, 1)")
      .beforeStyles({
        transform: "translateX(0)",
        opacity: 0,
        height: "90vh",
        width: "95vw",
        "--border-radius": "20px",
        "border-radius": "20px",
        // opacity: "1",
        overflow: "inherit",
      })
      .fromTo("opacity", "0", "1");

    // SHADOW IOS
    const shadowIOSAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-shadow")!)
      // .fromTo("background", "transparent", "var(--ion-color-dark)")
      .fromTo("opacity", "0", "0.2");

    // SHADOW ANDROID
    const shadowAndroidAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".sc-ion-modal-md")!)
      .beforeStyles({
        overflow: "hidden !important",
      })
      // .fromTo("background", "transparent", "var(--ion-color-dark)")
      .fromTo("opacity", "0", "0.2");

    // ALL CONTENT BELOW MODAL
    // const contentAnimation = new AnimationController()
    //   .create()
    //   .addElement(homeComponent.nativeElement)
    //   .addElement(tabComponent.nativeElement);
    // .fromTo("filter", "blur(0px)", "blur(20px)");

    // BACKDROP
    const backdropAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector("ion-backdrop"))
      .fromTo("opacity", "0.01", "var(--backdrop-opacity)");
    // .fromTo("backdropFilter", "blur(0px) opacity(1)", "blur(100px) opacity(0)");

    return new AnimationController()
      .create()
      .addElement(baseEl)
      .easing("ease-out")
      .duration(300)
      .addAnimation([
        backdropAnimation,
        shadowIOSAnimation,
        shadowAndroidAnimation,
        // wrapperAnimation,
        anim2,
      ]);
  };
  return animation;
};

export const SCleaveAnimation = () =>
  // tabComponent: ElementRef<any>,
  // homeComponent: ElementRef<any>
  {
    const animation = (baseEl) => {
      return SCenterAnimation()(baseEl).direction("reverse");
    };
    return animation;
  };
