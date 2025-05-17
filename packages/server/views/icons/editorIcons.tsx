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

interface IconProps {
  title: string;
}

export const BoldIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linejoin="round"
      d="M6.75 3.744h-.753v8.25h7.125a4.125 4.125 0 0 0 0-8.25H6.75Zm0 0v.38m0 16.122h6.747a4.5 4.5 0 0 0 0-9.001h-7.5v9h.753Zm0 0v-.37m0-15.751h6a3.75 3.75 0 1 1 0 7.5h-6m0-7.5v7.5m0 0v8.25m0-8.25h6.375a4.125 4.125 0 0 1 0 8.25H6.75m.747-15.38h4.875a3.375 3.375 0 0 1 0 6.75H7.497v-6.75Zm0 7.5h5.25a3.75 3.75 0 0 1 0 7.5h-5.25v-7.5Z"
    />
  </svg>
);

export const ItalicIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.248 20.246H9.05m0 0h3.696m-3.696 0 5.893-16.502m0 0h-3.697m3.697 0h3.803"
    />
  </svg>
);

export const StrikeIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 12a8.912 8.912 0 0 1-.318-.079c-1.585-.424-2.904-1.247-3.76-2.236-.873-1.009-1.265-2.19-.968-3.301.59-2.2 3.663-3.29 6.863-2.432A8.186 8.186 0 0 1 16.5 5.21M6.42 17.81c.857.99 2.176 1.812 3.761 2.237 3.2.858 6.274-.23 6.863-2.431.233-.868.044-1.779-.465-2.617M3.75 12h16.5"
    />
  </svg>
);

export const UnderlineIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17.995 3.744v7.5a6 6 0 1 1-12 0v-7.5m-2.25 16.502h16.5"
    />
  </svg>
);

export const HighlightIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
    />
  </svg>
);

export const CodeIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
    />
  </svg>
);

export const CodeBlockIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
    />
  </svg>
);

export const H1Icon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627 2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25"
    />
  </svg>
);

export const H2Icon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21.75 19.5H16.5v-1.609a2.25 2.25 0 0 1 1.244-2.012l2.89-1.445c.651-.326 1.116-.955 1.116-1.683 0-.498-.04-.987-.118-1.463-.135-.825-.835-1.422-1.668-1.489a15.202 15.202 0 0 0-3.464.12M2.243 4.492v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501"
    />
  </svg>
);

export const H3Icon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M20.905 14.626a4.52 4.52 0 0 1 .738 3.603c-.154.695-.794 1.143-1.504 1.208a15.194 15.194 0 0 1-3.639-.104m4.405-4.707a4.52 4.52 0 0 0 .738-3.603c-.154-.696-.794-1.144-1.504-1.209a15.19 15.19 0 0 0-3.639.104m4.405 4.708H18M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501"
    />
  </svg>
);

export const ParagraphIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path d="M13 4v16" />
    <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
    <path d="M17 4v16" />
  </svg>
);

export const LinkIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
    />
  </svg>
);

export const ImageIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
    />
  </svg>
);

export const CenterIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="17" x2="7" y1="12" y2="12" />
    <line x1="19" x2="5" y1="18" y2="18" />
  </svg>
);

export const LeftIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </svg>
);

export const RightIcon = ({ title }: IconProps) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="9" y1="12" y2="12" />
    <line x1="21" x2="7" y1="18" y2="18" />
  </svg>
);

export const SmallIcon = ({ title = 'Small size' }) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 10v4a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2zm3 2h8m-4-2v4"
    />
  </svg>
);

export const LargeIcon = ({ title = 'Large size' }) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2zm5 5h8m-4-4v8"
    />
  </svg>
);

export const MediumIcon = ({ title = 'Medium size' }) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 9v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2zm4 3h8m-4-3v6"
    />
  </svg>
);

export const AutoIcon = ({ title = 'Auto size' }) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 8l4 4 4-4m-8 8l4-4 4 4M4 9v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2z"
    />
  </svg>
);

export const HrIcon = ({ title = 'Horizontal rule' }) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

export const TableIcon = ({ title = 'Table' }) => (
  <svg style={style} {...commonProps}>
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5"
    />
  </svg>
);
