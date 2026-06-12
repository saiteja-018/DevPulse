import prisma from './lib/prisma'

const defaultTags = [
  { name: 'React', color: '#61DAFB' },
  { name: 'Next.js', color: '#FFFFFF' },
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Node.js', color: '#339933' },
  { name: 'Python', color: '#3776AB' },
  { name: 'Bug Fix', color: '#E34F26' },
  { name: 'Refactor', color: '#F0DB4F' },
  { name: 'Performance', color: '#00ADD8' },
  { name: 'UI/UX', color: '#FF4154' },
  { name: 'Backend', color: '#555555' },
];

async function main() {
  console.log('Seeding tags...');
  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log('Tags seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
