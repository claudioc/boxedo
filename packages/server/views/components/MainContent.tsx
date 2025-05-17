interface MainContentProps {
  children: string | JSX.Element[] | JSX.Element;
}

export const MainContent = ({ children }: MainContentProps) => (
  <div class="MainContent">{children}</div>
);
