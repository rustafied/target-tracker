/**
 * Map caliber names and categories to bullet icon types
 */
export type BulletType = 'rifle' | 'pistol' | 'rimfire' | 'shotgun';

export function getBulletType(caliberName: string, category?: string): BulletType {
  const name = caliberName.toLowerCase();
  const cat = category?.toLowerCase() || '';
  
  // Shotgun
  if (cat.includes('shotgun') || name.includes('gauge')) {
    return 'shotgun';
  }
  
  // Rimfire
  if (name.includes('.22 lr') || name.includes('22lr') || name.includes('.17 hmr')) {
    return 'rimfire';
  }
  
  // Pistol calibers (straight-walled)
  if (
    cat.includes('pistol') ||
    name.includes('9mm') ||
    name.includes('.45 acp') ||
    name.includes('.40 s&w') ||
    name.includes('.380') ||
    name.includes('38 special') ||
    name.includes('.38 spl') ||
    name.includes('357 magnum') ||
    name.includes('.357 mag') ||
    name.includes('10mm') ||
    name.includes('.44 mag')
  ) {
    return 'pistol';
  }
  
  // Default to rifle (bottleneck cartridges)
  return 'rifle';
}

export function getBulletIcon(caliberName: string, category?: string): string {
  const type = getBulletType(caliberName, category);
  return `/bullets/${type}.svg`;
}
