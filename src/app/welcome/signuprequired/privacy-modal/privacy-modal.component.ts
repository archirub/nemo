import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-privacy-modal',
  templateUrl: './privacy-modal.component.html',
  styleUrls: ['./privacy-modal.component.scss'],
})
export class PrivacyModalComponent implements OnInit {
  
  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {}

  async closeModal() {
    return await this.modalCtrl.dismiss();
  }
  
}
