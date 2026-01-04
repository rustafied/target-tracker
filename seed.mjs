import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('./seed_data.json', 'utf-8'));

async function seedDatabase() {
  const baseUrl = 'http://localhost:3000/api';

  console.log('Seeding Firearms...');
  for (const firearm of seedData.firearms) {
    try {
      const res = await fetch(`${baseUrl}/firearms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firearm)
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Added firearm: ${firearm.name}`);
      } else {
        console.log(`✗ Failed to add firearm: ${firearm.name}`);
      }
    } catch (error) {
      console.log(`✗ Error adding firearm: ${firearm.name}`, error);
    }
  }

  console.log('\nSeeding Optics...');
  for (const optic of seedData.optics) {
    try {
      const res = await fetch(`${baseUrl}/optics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optic)
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Added optic: ${optic.name}`);
      } else {
        console.log(`✗ Failed to add optic: ${optic.name}`);
      }
    } catch (error) {
      console.log(`✗ Error adding optic: ${optic.name}`, error);
    }
  }

  console.log('\nSeeding Calibers...');
  for (const caliber of seedData.calibers) {
    try {
      const res = await fetch(`${baseUrl}/calibers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caliber)
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Added caliber: ${caliber.name}`);
      } else {
        console.log(`✗ Failed to add caliber: ${caliber.name}`);
      }
    } catch (error) {
      console.log(`✗ Error adding caliber: ${caliber.name}`, error);
    }
  }

  console.log('\n✅ Database seeding complete!');
}

seedDatabase();

