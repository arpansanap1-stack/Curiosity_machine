import { Domain, RelationType, DepthLevel } from '../types';

export const DOMAIN_COLORS: Record<Domain, string> = {
  science: '#5BC0FF',
  nature: '#56D39B',
  history: '#F2B45C',
  art: '#F472B6',
  tech: '#8B8CFF',
  math: '#22D3EE',
  philosophy: '#C084FC',
  society: '#FB7C5C',
  other: '#9AA3B8',
};

export const DOMAIN_COLORS_ATLAS: Record<Domain, string> = {
  science: '#499ACC',
  nature: '#46AA7D',
  history: '#C99347',
  art: '#C95C95',
  tech: '#6E6FCC',
  math: '#1BA9BE',
  philosophy: '#9C6ACC',
  society: '#CA6248',
  other: '#7C8394',
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  science: 'Science',
  nature: 'Nature',
  history: 'History',
  art: 'Art & Culture',
  tech: 'Technology',
  math: 'Mathematics',
  philosophy: 'Philosophy',
  society: 'Society',
  other: 'Interdisciplinary',
};

export const RELATION_LABELS: Record<RelationType, string> = {
  causes: 'Causes / Drives',
  part_of: 'Component of',
  analogous_to: 'Analogous to',
  contrasts_with: 'Contrasts with',
  inspired: 'Inspired / Led to',
  origin_of: 'Historical origin of',
  applies_to: 'Applies to',
};

export const DEPTH_LABELS: Record<DepthLevel, { title: string; subtitle: string }> = {
  simple: { title: 'Simple', subtitle: 'Intuitive & vivid explanation' },
  student: { title: 'Student', subtitle: 'Foundations & mechanics' },
  undergrad: { title: 'Undergrad', subtitle: 'Technical precision & nuance' },
  expert: { title: 'Expert', subtitle: 'Frontiers, paradoxes & open questions' },
};

export const CURIOUS_PROMPT_CHIPS = [
  'Octopus intelligence',
  'Why do we dream?',
  'Quantum entanglement',
  'How do bees count?',
  'Bioluminescence',
  'Origin of zero',
  'Why is the sky blue?',
  'Mycelium networks',
];
