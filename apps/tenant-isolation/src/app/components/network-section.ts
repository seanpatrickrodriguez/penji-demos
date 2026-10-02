import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NETWORK_TREE, STAFF_ROWS } from '../view/network-view';

@Component({
  selector: 'app-network-section',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './network-section.html',
  styleUrl: './network-section.scss',
})
export class NetworkSection {
  protected readonly tree = NETWORK_TREE;
  protected readonly staff = STAFF_ROWS;
}
