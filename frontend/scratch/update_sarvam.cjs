const fs = require('fs');
const filePath = 'E:/Tarka_v3/tarka/frontend/src/components/tarka/SarvamVoiceModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `<Zap size={10} /> LLAMA 3.1 8B ACTIVE`;
const replacement = `<Shield size={10} color="#34D399" /> 🔒 100% Air-Gapped On-Device Speech Synthesis (0 External API Calls)`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated SarvamVoiceModal.tsx');
} else {
  console.error('Target not found');
}

