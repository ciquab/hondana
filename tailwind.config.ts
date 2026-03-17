import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#B45309', /* amber-700 */
          dark:    '#92400E', /* amber-800 */
        },
        action: {
          DEFAULT: '#EA580C', /* orange-600 */
          hover:   '#C2410C', /* orange-700 */
        },
        active:   '#D97706', /* amber-600 */
        alert:    '#E11D48', /* rose-600 */
        mission:  '#4F46E5', /* indigo-600 */
        complete: '#059669', /* emerald-600 */
      },
      screens: {
        /* スマホファースト: sm を 390px 基準に */
        sm: '390px',
      },
    }
  },
  plugins: []
};

export default config;
