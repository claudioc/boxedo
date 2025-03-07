import styles from './MainContent.module.css';

interface MainContentProps {
  children: string | JSX.Element[] | JSX.Element;
}

export const MainContent = ({ children }: MainContentProps) => (
  <div class={styles.mainContent}>{children}</div>
);
