import {
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  UnderlineIcon,
  HighlightIcon,
  CodeIcon,
  CodeBlockIcon,
  H2Icon,
  H3Icon,
  ParagraphIcon,
  LinkIcon,
  LeftIcon,
  CenterIcon,
  RightIcon,
  ImageIcon,
} from '../icons/editorIcons';

import styles from './EditorEnabler.module.css';

export const EditorEnabler = () => (
  <>
    {/* We need both global and local class. The global class is used to setup the menu for tiptap */}
    <div class={[styles.bubbleMenu, 'bubbleMenu']}>
      <div x-show="!$store.editorState.isImage()">
        <button type="button" data-command="bold">
          <BoldIcon />
        </button>
        <button type="button" data-command="italic">
          <ItalicIcon />
        </button>
        <button type="button" data-command="strike">
          <StrikeIcon />
        </button>
        <button type="button" data-command="underline">
          <UnderlineIcon />
        </button>
        <div aria-hidden="true" class={styles.separator} />
        <button type="button" data-command="highlight">
          <HighlightIcon />
        </button>
        <div aria-hidden="true" class={styles.separator} />
        <button type="button" data-command="code">
          <CodeIcon />
        </button>
        <button type="button" data-command="codeblock">
          <CodeBlockIcon />
        </button>
        <div aria-hidden="true" class={styles.separator} />
        <button type="button" data-command="h2">
          <H2Icon />
        </button>
        <button type="button" data-command="h3">
          <H3Icon />
        </button>
        <button type="button" data-command="p">
          <ParagraphIcon />
        </button>
        <div aria-hidden="true" class={styles.separator} />
        <button type="button" data-command="link">
          <LinkIcon />
        </button>
        <div aria-hidden="true" class={styles.separator} />
      </div>
      <div>
        <button type="button" data-command="alignLeft">
          <LeftIcon />
        </button>
        <button type="button" data-command="alignCenter">
          <CenterIcon />
        </button>
        <button type="button" data-command="alignRight">
          <RightIcon />
        </button>
      </div>
    </div>

    {/* We need both global and local class. The global class is used to setup the menu for tiptap */}
    <div class={[styles.floatingMenu, 'floatingMenu']}>
      <button type="button" data-command="h2">
        <H2Icon />
      </button>
      <button type="button" data-command="h3">
        <H3Icon />
      </button>
      <button type="button" data-command="image">
        <ImageIcon />
      </button>
    </div>
    <script defer>App.enableEditor();</script>
  </>
);
