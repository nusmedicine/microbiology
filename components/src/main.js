import { mount } from 'svelte';
import CasePlayer from './CasePlayer.svelte';
import Quiz from './Quiz.svelte';
import GramStain from './GramStain.svelte';
import OxygenTube from './OxygenTube.svelte';
import ContrastPair from './ContrastPair.svelte';
import MicrobeProfile from './MicrobeProfile.svelte';
import Flashcards from './Flashcards.svelte';
import BacteriaMap from './BacteriaMap.svelte';
import { resolveAsset } from './lib/base.js';

// Island registry: data-island="<key>" -> Svelte component.
const REGISTRY = {
  case: CasePlayer,
  quiz: Quiz,
  'gram-stain': GramStain,
  'oxygen-tube': OxygenTube,
  'contrast-pair': ContrastPair,
  'microbe-profile': MicrobeProfile,
  flashcards: Flashcards,
  'bacteria-map': BacteriaMap,
};

function init() {
  document.querySelectorAll('[data-island]').forEach((el) => {
    if (el.dataset.mounted) return;
    const Comp = REGISTRY[el.getAttribute('data-island')];
    if (!Comp) return;
    el.dataset.mounted = '1';
    mount(Comp, { target: el, props: { src: resolveAsset(el.getAttribute('data-src')) } });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
