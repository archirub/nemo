import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";

export const WavesFastAnimation = (waves: ElementRef) => {
  const fastAnimation = new AnimationController().create("fastAnimation");

  fastAnimation
    .addElement(waves.nativeElement)
    .duration(1000)
    .fromTo("transform", "translate(-70px) scale(1.4)", "translate(30px) scale(1.4)")
    .iterations(Infinity);

  return fastAnimation;
};

export const WavesSlowAnimation = (waves: ElementRef) => {
  const slowAnimation = new AnimationController().create("slowAnimation");

  slowAnimation
    .addElement(waves.nativeElement)
    .duration(2000)
    .fromTo("transform", "translate(-70px) scale(1.4)", "translate(30px) scale(1.4)")
    .iterations(Infinity);

  return slowAnimation;
};
