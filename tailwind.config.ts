import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { navy: {50:'#eef4f7',100:'#d9e7ee',500:'#20485f',700:'#17364b',900:'#0d2538'}, mint: {50:'#effcf7',100:'#d8f7ea',300:'#82e0bd',500:'#35c894',600:'#21a978'} } } }, plugins: [] };
export default config;
