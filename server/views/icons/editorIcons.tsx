const style = {
  width: '18px',
  height: '18px',
};

const commonProps = {
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
};

export const BoldIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Bold selection</title>
    <path
      stroke-linejoin="round"
      d="M6.75 3.744h-.753v8.25h7.125a4.125 4.125 0 0 0 0-8.25H6.75Zm0 0v.38m0 16.122h6.747a4.5 4.5 0 0 0 0-9.001h-7.5v9h.753Zm0 0v-.37m0-15.751h6a3.75 3.75 0 1 1 0 7.5h-6m0-7.5v7.5m0 0v8.25m0-8.25h6.375a4.125 4.125 0 0 1 0 8.25H6.75m.747-15.38h4.875a3.375 3.375 0 0 1 0 6.75H7.497v-6.75Zm0 7.5h5.25a3.75 3.75 0 0 1 0 7.5h-5.25v-7.5Z"
    />
  </svg>
);

export const ItalicIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Italic selection</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.248 20.246H9.05m0 0h3.696m-3.696 0 5.893-16.502m0 0h-3.697m3.697 0h3.803"
    />
  </svg>
);

export const StrikeIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Strike selection</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 12a8.912 8.912 0 0 1-.318-.079c-1.585-.424-2.904-1.247-3.76-2.236-.873-1.009-1.265-2.19-.968-3.301.59-2.2 3.663-3.29 6.863-2.432A8.186 8.186 0 0 1 16.5 5.21M6.42 17.81c.857.99 2.176 1.812 3.761 2.237 3.2.858 6.274-.23 6.863-2.431.233-.868.044-1.779-.465-2.617M3.75 12h16.5"
    />
  </svg>
);

export const UnderlineIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Underline selection</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17.995 3.744v7.5a6 6 0 1 1-12 0v-7.5m-2.25 16.502h16.5"
    />
  </svg>
);

export const HighlightIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Highlight selection</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
    />
  </svg>
);
