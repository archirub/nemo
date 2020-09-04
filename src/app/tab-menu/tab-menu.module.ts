import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabMenuPageRoutingModule } from './tab-menu-routing.module';

import { TabMenuPage } from './tab-menu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabMenuPageRoutingModule
  ],
  declarations: [TabMenuPage]
})
export class TabMenuPageModule {}
