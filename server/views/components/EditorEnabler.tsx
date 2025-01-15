import {
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  UnderlineIcon,
  HighlightIcon,
  CodeIcon,
  CodeBlockIcon,
  H1Icon,
  H2Icon,
  ParagraphIcon,
  LinkIcon,
} from '../icons/editorIcons';

import styles from './EditorEnabler.module.css';

export const EditorEnabler = () => (
  <>
    {/* We need both global and local class. The global class is used to setup the menu for tiptap */}
    <div class={[styles.bubbleMenu, 'bubbleMenu']}>
      <button type="button" class="bmButton" data-command="bold">
        <BoldIcon />
      </button>
      <button type="button" class="bmButton" data-command="italic">
        <ItalicIcon />
      </button>
      <button type="button" class="bmButton" data-command="strike">
        <StrikeIcon />
      </button>
      <button type="button" class="bmButton" data-command="underline">
        <UnderlineIcon />
      </button>
      <div aria-hidden="true" class={styles.separator} />
      <button type="button" class="bmButton" data-command="highlight">
        <HighlightIcon />
      </button>
      <div aria-hidden="true" class={styles.separator} />
      <button type="button" class="bmButton" data-command="code">
        <CodeIcon />
      </button>
      <button type="button" class="bmButton" data-command="codeblock">
        <CodeBlockIcon />
      </button>
      <div aria-hidden="true" class={styles.separator} />
      <button type="button" class="bmButton" data-command="h1">
        <H1Icon />
      </button>
      <button type="button" class="bmButton" data-command="h2">
        <H2Icon />
      </button>
      <button type="button" class="bmButton" data-command="p">
        <ParagraphIcon />
      </button>
      <div aria-hidden="true" class={styles.separator} />
      <button type="button" class="bmButton" data-command="link">
        <LinkIcon />
      </button>
    </div>
    <script defer>App.enableEditor();</script>
  </>
);
