import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, input, signal } from '@angular/core';

@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  templateUrl: './banner-carousel.html',
  styleUrl: './banner-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerCarousel implements OnInit, OnDestroy {
  readonly banners = input<string[]>([]);

  protected readonly indice = signal(0);
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.intervalId = setInterval(() => this.siguiente(), 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  protected siguiente(): void {
    const total = this.banners().length;
    if (total === 0) return;
    this.indice.update((i) => (i + 1) % total);
  }

  protected irA(i: number): void {
    this.indice.set(i);
  }
}
