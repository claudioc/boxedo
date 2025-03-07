interface PageBodyProps {
  title: string;
  body: string;
}

export const PageBody = ({ title, body }: PageBodyProps) => (
  <div class="prose">
    <h1 class="title">{title}</h1>
    <div class="content">{`${body || ''}`}</div>
  </div>
);
