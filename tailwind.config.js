import plugin from 'tailwindcss/plugin';

import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.tsx'],
	theme: {
		fontFamily: {
			sans: `"Inter", "Roboto", ui-sans-serif, sans-serif, "Noto Color Emoji", "Twemoji Mozilla"`,
			mono: `"JetBrains Mono NL", ui-monospace, monospace`,
		},
	},
	corePlugins: {
		outlineStyle: false,
	},
	future: {
		hoverOnlyWhenSupported: true,
	},
	plugins: [
		forms(),
		plugin(({ addVariant, addUtilities }) => {
			addVariant('modal', '&:modal');
			addVariant('focus-within', '&:has(:focus-visible)');
			// addVariant('hover', '.is-mouse &:hover');
			// addVariant('group-hover', '.is-mouse .group &:hover');

			addUtilities({
				'.scrollbar-hide': {
					'-ms-overflow-style': 'none',
					'scrollbar-width': 'none',

					'&::-webkit-scrollbar': {
						display: 'none',
					},
				},

				'.outline-none': { 'outline-style': 'none' },
				'.outline': { 'outline-style': 'solid' },
				'.outline-dashed': { 'outline-style': 'dashed' },
				'.outline-dotted': { 'outline-style': 'dotted' },
				'.outline-double': { 'outline-style': 'double' },
			});
		}),
	],
};
