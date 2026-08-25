import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ds-avatar',
  standalone: true,
  template: `<span class="ds-avatar" [class.ds-avatar--sm]="size() === 'sm'">{{ initials() }}</span>`,
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly name = input<string>('');
  readonly size = input<'sm' | 'md'>('md');

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });
}
