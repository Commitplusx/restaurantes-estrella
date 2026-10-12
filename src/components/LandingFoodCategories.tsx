import { useEffect, useRef, useState } from 'react';
import { House, Utensils, Check } from 'lucide-react';
import './landingFoodCategories.css';

export interface LandingFoodCategory {
  name: string;
  emoji: string;
  image: string;
}

function CategoryPhoto({ image }: { image: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return image !== failedSource
    ? <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(image)} />
    : <Utensils size={20} strokeWidth={1.6} aria-hidden="true" />;
}

export default function LandingFoodCategories({ categories, selected, onSelect }: {
  categories: readonly LandingFoodCategory[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list || !window.matchMedia('(max-width: 767px)').matches) return;
    const button = Array.from(list.querySelectorAll<HTMLButtonElement>('button'))
      .find(element => element.dataset.category === (selected || ''));
    if (button) list.scrollTo({ left: button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [selected, categories]);

  return (
    <section id="eats-desktop-categories" tabIndex={-1} className="eats-desktop-categories landing-food-categories" aria-labelledby="food-categories-title">
      <div className="food-categories-heading">
        <h2 id="food-categories-title">Busca por tipo de comida</h2>
        <p>{selected ? `Mostrando ${selected}` : 'Filtra los restaurantes por categoría'}</p>
      </div>
      <div ref={listRef} className="food-categories-list" role="group" aria-label="Tipos de comida">
        <button type="button" data-category="" aria-pressed={selected === null} onClick={() => onSelect(null)}>
          <span className="food-category-photo"><House size={23} strokeWidth={1.7} aria-hidden="true" /></span>
          <span className="food-category-name">Todos</span>
          {selected === null && <Check size={16} className="food-category-check" aria-hidden="true" />}
        </button>
        {categories.map(category => (
          <button type="button" key={category.name} data-category={category.name} aria-pressed={selected === category.name} onClick={() => onSelect(category.name)}>
            <span className="food-category-photo"><CategoryPhoto image={category.image} /></span>
            <span className="food-category-name">{category.name}</span>
            {selected === category.name && <Check size={16} className="food-category-check" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </section>
  );
}
