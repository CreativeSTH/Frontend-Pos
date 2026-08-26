import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './storefront-layout.html',
  styleUrl: './storefront-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontLayout {}
