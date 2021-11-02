import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const FadeOutAnimation = (el: HTMLElement, duration: number) => {
  // Moving off-screen
  const fadeAnimation = new AnimationController().create("fadeAnimation");
  fadeAnimation
    .addElement(el)
    .easing("ease-out")
    .duration(duration)
    .fromTo("opacity", "1", "0")
    .beforeStyles({
      opacity: "1",
    })
    .afterStyles({
      opacity: "0",
    });

  return fadeAnimation;
};
