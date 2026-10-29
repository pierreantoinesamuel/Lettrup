const fs = require('fs');

const NEW_GALLERY = `  {
    id: 'mb_tokyo',
    name: 'MB Tokyo',
    categories: ['modern', 'professional'],
    description: 'Bandeau noir supérieur avec liseré orange, très structuré.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#000000', '#f97316', '#ffffff'],
    layoutType: 'mb_tokyo'
  },
  {
    id: 'mb_oslo',
    name: 'MB Oslo',
    categories: ['modern', 'simple'],
    description: 'Fond bleu-gris avec bloc de titre marine.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#8fa1c9', '#293c66', '#ffffff'],
    layoutType: 'mb_oslo'
  },
  {
    id: 'mb_helsinki',
    name: 'MB Helsinki',
    categories: ['creative', 'simple'],
    description: 'Design lavande léger avec photo à droite.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#d4d1ed', '#312e81', '#ffffff'],
    layoutType: 'mb_helsinki'
  },
  {
    id: 'mb_stockholm',
    name: 'MB Stockholm',
    categories: ['creative', 'modern'],
    description: 'Fond rose poudré avec typographie élégante bordeaux.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#e1d5e3', '#b45d77', '#ffffff'],
    layoutType: 'mb_stockholm'
  },
  {
    id: 'mb_berlin',
    name: 'MB Berlin',
    categories: ['modern', 'professional'],
    description: 'Barre latérale sombre contrastée avec accents cyan.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#4a4a4a', '#00bcd4', '#ffffff'],
    layoutType: 'mb_berlin'
  },
  {
    id: 'mb_london',
    name: 'MB London',
    categories: ['simple', 'professional'],
    description: 'Très propre et blanc avec des séparateurs bleus vifs.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#ffffff', '#2563eb', '#1e293b'],
    layoutType: 'mb_london'
  },
  {
    id: 'mb_paris',
    name: 'MB Paris',
    categories: ['modern', 'professional'],
    description: 'En-tête de page complet noir, photo à gauche, très graphique.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#1a1a1a', '#ffffff', '#000000'],
    layoutType: 'mb_paris'
  },
  {
    id: 'mb_rome',
    name: 'MB Rome',
    categories: ['creative', 'simple'],
    description: 'Encadrement vert sauge épais sur toute la bordure.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#ffffff', '#81b29a', '#1e293b'],
    layoutType: 'mb_rome'
  },
  {
    id: 'mb_madrid',
    name: 'MB Madrid',
    categories: ['simple', 'professional'],
    description: 'Monochrome minimaliste, lignes noires fines.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#ffffff', '#000000', '#1e293b'],
    layoutType: 'mb_madrid'
  },
  {
    id: 'mb_vienna',
    name: 'MB Vienna',
    categories: ['simple', 'modern'],
    description: 'Liseré supérieur vert et accents verts frais.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#ffffff', '#16a34a', '#1e293b'],
    layoutType: 'mb_vienna'
  },
  {
    id: 'mb_tokyo_alt',
    name: 'MB Tokyo Alt',
    categories: ['modern', 'professional'],
    description: 'Alternative du design Tokyo (strictement identique).',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#000000', '#f97316', '#ffffff'],
    layoutType: 'mb_tokyo_alt'
  },
  {
    id: 'mb_geneva',
    name: 'MB Geneva',
    categories: ['modern', 'simple'],
    description: 'Nom surligné avec un bloc bleu ciel.',
    candidateName: 'MARIE BERNARD',
    candidateRole: 'Consultante',
    colors: ['#ffffff', '#e0f2fe', '#0369a1'],
    layoutType: 'mb_geneva'
  }`;

const content = fs.readFileSync('src/TemplatesGallery.tsx', 'utf8');
const lines = content.split('\n');

// Find end of TEMPLATES_DATA array
const arrayEndIndex = lines.findIndex(line => line.trim() === '];');
const beforeArray = lines.slice(0, arrayEndIndex).join('\n');
const afterArray = lines.slice(arrayEndIndex).join('\n');

const newContentArray = beforeArray + ',\n' + NEW_GALLERY + '\n' + afterArray;

fs.writeFileSync('src/TemplatesGallery.tsx', newContentArray);
console.log('TemplatesGallery data appended successfully.');
