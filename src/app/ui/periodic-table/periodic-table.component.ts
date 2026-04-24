import { Component, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ElementData, ElementCategory } from '../../models';
import { ELEMENTS } from '../../lib/atom-data';

const CATEGORY_LABELS: Record<ElementCategory, string> = {
  'nonmetal': 'Nonmetals',
  'noble-gas': 'Noble Gases',
  'alkali-metal': 'Alkali Metals',
  'alkaline-earth': 'Alkaline Earths',
  'metalloid': 'Metalloids',
  'halogen': 'Halogens',
  'post-transition-metal': 'Post-transition Metals',
  'transition-metal': 'Transition Metals',
  'lanthanide': 'Lanthanides',
  'actinide': 'Actinides',
  'unknown': 'Unknown',
};

const CATEGORY_ORDER: ElementCategory[] = [
  'nonmetal', 'halogen',
  'alkali-metal', 'alkaline-earth',
  'transition-metal', 'post-transition-metal', 'metalloid',
  'lanthanide', 'actinide', 'unknown',
  'noble-gas',
];

interface ElementGroup {
  category: ElementCategory;
  label: string;
  elements: ElementData[];
}

@Component({
  selector: 'app-periodic-table',
  imports: [FormsModule],
  templateUrl: './periodic-table.component.html',
  styleUrl: './periodic-table.component.scss',
})
export class PeriodicTableComponent {
  readonly elementSelected = output<ElementData>();

  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    return q ? ELEMENTS.filter(e =>
      e.symbol.toLowerCase().startsWith(q) ||
      e.name.toLowerCase().includes(q) ||
      String(e.atomicNumber).startsWith(q)
    ) : null;
  });

  readonly groups = computed((): ElementGroup[] => {
    return CATEGORY_ORDER
      .map(cat => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        elements: ELEMENTS.filter(e => e.category === cat),
      }))
      .filter(g => g.elements.length > 0);
  });

  readonly #collapsed = signal<Set<ElementCategory>>(new Set([
    'halogen', 'alkali-metal', 'alkaline-earth',
    'transition-metal', 'post-transition-metal', 'metalloid',
    'lanthanide', 'actinide', 'unknown', 'noble-gas',
  ]));

  isOpen(cat: ElementCategory): boolean {
    return !this.#collapsed().has(cat);
  }

  toggleCategory(cat: ElementCategory): void {
    this.#collapsed.update(s => {
      const next = new Set(s);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  select(element: ElementData): void {
    this.elementSelected.emit(element);
  }

  bondLabel(el: ElementData): string {
    const v = el.valences.at(0) ?? 0;
    if (v === 0) return 'No bonds (noble gas)';
    return v === 1 ? '1 bond' : `${v} bonds`;
  }

  trackById(_: number, e: ElementData): number { return e.atomicNumber; }
  trackByCat(_: number, g: ElementGroup): string { return g.category; }
}
