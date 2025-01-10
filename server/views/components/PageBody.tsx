import styles from './PageBody.module.css';

interface PageBodyProps {
  title: string;
  body: string;
}

export const PageBody = ({ title, body }: PageBodyProps) => (
  <div class={styles.mainContent}>
    <h1 class="title">{title}</h1>
    <div class="content">{`${body || ''}`}</div>
  </div>
);
