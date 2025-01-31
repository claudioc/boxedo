export const ArrowLeftIcon = ({
  title,
  size = 18,
}: { title: string; size?: number }) => (
  <svg
    style={{ width: `${size}px`, height: `${size}px` }}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <title>{title}</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
    />
  </svg>
);
