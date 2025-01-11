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

export const CodeIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Code</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
    />
  </svg>
);

export const CodeBlockIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Code Block</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
    />
  </svg>
);

export const H1Icon = () => (
  <svg style={style} {...commonProps}>
    <title>Toggle H1 level</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627 2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25"
    />
  </svg>
);

export const H2Icon = () => (
  <svg style={style} {...commonProps}>
    <title>Toggle H2 level</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21.75 19.5H16.5v-1.609a2.25 2.25 0 0 1 1.244-2.012l2.89-1.445c.651-.326 1.116-.955 1.116-1.683 0-.498-.04-.987-.118-1.463-.135-.825-.835-1.422-1.668-1.489a15.202 15.202 0 0 0-3.464.12M2.243 4.492v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501"
    />
  </svg>
);

export const ParagraphIcon = () => (
  <svg style={style} {...commonProps}>
    <title>Paragraph</title>
    <path d="M13 4v16" />
    <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
    <path d="M17 4v16" />
  </svg>
);
