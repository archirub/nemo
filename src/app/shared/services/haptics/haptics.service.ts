import { Injectable } from "@angular/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

@Injectable({
  providedIn: "root",
})
export class HapticsService {
  constructor() {}

  hapticsImpactMedium = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
  };

  hapticsImpactLight = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
  };

  hapticsVibrate = async () => {
    await Haptics.vibrate();
  };

  hapticsSelectionStart = async () => {
    await Haptics.selectionStart();
  };

  hapticsSelectionChanged = async () => {
    await Haptics.selectionChanged();
  };

  hapticsSelectionEnd = async () => {
    await Haptics.selectionEnd();
  };
}
