import fs from 'fs';
import path from 'path';

const dirs = ['./src/components', './src'];

const replaceInFile = (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/from 'firebase\/firestore'/g, "from '../lib/supabaseAdapter'");
  content = content.replace(/from 'firebase\/storage'/g, "from '../lib/supabaseAdapter'");
  content = content.replace(/import\('firebase\/firestore'\)/g, "import('../lib/supabaseAdapter')");
  content = content.replace(/import\('firebase\/storage'\)/g, "import('../lib/supabaseAdapter')");
  content = content.replace(/from '\.\.\/lib\/firebase'/g, "from '../lib/supabaseAdapter'");
  content = content.replace(/from '\.\/lib\/firebase'/g, "from './lib/supabaseAdapter'");
  content = content.replace(/from '\.\.\/lib\/firestoreErrorHandler'/g, "from '../lib/supabaseErrorHandler'");
  content = content.replace(/from '\.\/lib\/firestoreErrorHandler'/g, "from './lib/supabaseErrorHandler'");
  content = content.replace(/handleFirestoreError/g, "handleSupabaseError");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
};

const walk = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else {
      replaceInFile(fullPath);
    }
  }
};

dirs.forEach(walk);
console.log('Migration to Supabase completed.');
