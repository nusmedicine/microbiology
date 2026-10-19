import { mount } from 'svelte';
import CasePlayer from './CasePlayer.svelte';
import Quiz from './Quiz.svelte';
import GramStain from './GramStain.svelte';
import OxygenTube from './OxygenTube.svelte';
import ContrastPair from './ContrastPair.svelte';
import MicrobeProfile from './MicrobeProfile.svelte';
import Flashcards from './Flashcards.svelte';
import BacteriaMap from './BacteriaMap.svelte';
import SortingKey from './SortingKey.svelte';
import RankOrder from './RankOrder.svelte';
import Sorter from './Sorter.svelte';
import SelectionSim from './SelectionSim.svelte';
import DamageResponse from './DamageResponse.svelte';
import EpidemicSim from './EpidemicSim.svelte';
import MicReader from './MicReader.svelte';
import BodyMap from './BodyMap.svelte';
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
  'sorting-key': SortingKey,
  'mic-reader': MicReader,
  'epidemic-sim': EpidemicSim,
  'damage-response': DamageResponse,
  'selection-sim': SelectionSim,
  'sorter': Sorter,
  'rank-order': RankOrder,
  'body-map': BodyMap,
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
