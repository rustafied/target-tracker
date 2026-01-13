/**
 * Map optic types and names to icon types
 */
export type OpticType = 'red-dot' | 'scope' | 'holographic' | 'iron-sights' | 'acog';

export function getOpticType(opticName: string, opticType?: string): OpticType {
  const name = opticName.toLowerCase();
  const type = opticType?.toLowerCase() || '';
  
  // Check for iron sights
  if (
    name.includes('iron') ||
    name.includes('irons') ||
    type.includes('iron')
  ) {
    return 'iron-sights';
  }
  
  // Check for ACOG (Trijicon prism scopes)
  if (
    name.includes('acog') ||
    name.includes('ta31') ||
    name.includes('ta11') ||
    name.includes('trijicon acog') ||
    type.includes('acog')
  ) {
    return 'acog';
  }
  
  // Check for holographic
  if (
    name.includes('eotech') ||
    name.includes('holographic') ||
    name.includes('holo') ||
    name.includes('exps') ||
    name.includes('xps') ||
    type.includes('holographic')
  ) {
    return 'holographic';
  }
  
  // Check for red dot
  if (
    name.includes('red dot') ||
    name.includes('reddot') ||
    name.includes('aimpoint') ||
    name.includes('holosun') ||
    name.includes('sig romeo') ||
    name.includes('trijicon mro') ||
    name.includes('vortex venom') ||
    name.includes('reflex') ||
    type.includes('red dot')
  ) {
    return 'red-dot';
  }
  
  // Default to scope (LPVO, magnified optics)
  return 'scope';
}

export function getOpticIcon(opticName: string, opticType?: string): string {
  const type = getOpticType(opticName, opticType);
  return `/optics/${type}.svg`;
}
