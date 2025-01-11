import {
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  UnderlineIcon,
  HighlightIcon,
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
      <button type="button" class="bmButton" data-command="highlight">
        <HighlightIcon />
      </button>
    </div>
    <script defer>{'App.enableEditor()'}</script>
  </>
);
