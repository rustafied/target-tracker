/**
 * Map firearm names to icon types
 */
export type FirearmType = 'rifle' | 'pistol' | 'shotgun';

export function getFirearmType(firearmName: string): FirearmType {
  const name = firearmName.toLowerCase();
  
  // Check for shotgun
  if (
    name.includes('shotgun') ||
    name.includes('12ga') ||
    name.includes('20ga') ||
    name.includes('mossberg') ||
    name.includes('remington 870')
  ) {
    return 'shotgun';
  }
  
  // Check for pistol/handgun
  if (
    name.includes('pistol') ||
    name.includes('glock') ||
    name.includes('sig') ||
    name.includes('1911') ||
    name.includes('cz') ||
    name.includes('beretta') ||
    name.includes('handgun') ||
    name.includes('revolver')
  ) {
    return 'pistol';
  }
  
  // Default to rifle
  return 'rifle';
}

export function getFirearmIcon(firearmName: string): string {
  const type = getFirearmType(firearmName);
  return `/firearms/${type}.svg`;
}
