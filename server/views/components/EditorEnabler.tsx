import type { WithCtx } from '~/../types';
import {
  AutoIcon,
  BoldIcon,
  CenterIcon,
  CodeBlockIcon,
  CodeIcon,
  H2Icon,
  H3Icon,
  HighlightIcon,
  HrIcon,
  ImageIcon,
  ItalicIcon,
  LeftIcon,
  LinkIcon,
  MediumIcon,
  ParagraphIcon,
  RightIcon,
  SmallIcon,
  StrikeIcon,
  TableIcon,
  UnderlineIcon,
} from '../icons/editorIcons';

import styles from './EditorEnabler.module.css';

interface EditorEnablerProps extends WithCtx {}

export const EditorEnabler = ({ ctx }: EditorEnablerProps) => {
  const { i18n } = ctx.app;

  return (
    <>
      {/* We need both global and local class. The global class is used to setup the menu for tiptap */}
      <div class={[styles.bubbleMenu, 'bubbleMenu']}>
        <div x-show="!$store.editorState.isImage()">
          <button type="button" data-command="bold">
            <BoldIcon title={i18n.t('EditIcons.boldSelection')} />
          </button>
          <button type="button" data-command="italic">
            <ItalicIcon title={i18n.t('EditIcons.italicSelection')} />
          </button>
          <button type="button" data-command="strike">
            <StrikeIcon title={i18n.t('EditIcons.strikeSelection')} />
          </button>
          <button type="button" data-command="underline">
            <UnderlineIcon title={i18n.t('EditIcons.underlineSelection')} />
          </button>
          <div aria-hidden="true" class={styles.separator} />
          <button type="button" data-command="highlight">
            <HighlightIcon title={i18n.t('EditIcons.highlightSelection')} />
          </button>
          <div aria-hidden="true" class={styles.separator} />
          <button type="button" data-command="code">
            <CodeIcon title={i18n.t('EditIcons.code')} />
          </button>
          <button type="button" data-command="codeblock">
            <CodeBlockIcon title={i18n.t('EditIcons.codeBlock')} />
          </button>
          <div aria-hidden="true" class={styles.separator} />
          <button type="button" data-command="h2">
            <H2Icon title={i18n.t('EditIcons.toggleH2Level')} />
          </button>
          <button type="button" data-command="h3">
            <H3Icon title={i18n.t('EditIcons.toggleH3Level')} />
          </button>
          <button type="button" data-command="p">
            <ParagraphIcon title={i18n.t('EditIcons.paragraph')} />
          </button>
          <div aria-hidden="true" class={styles.separator} />
          <button type="button" data-command="link">
            <LinkIcon title={i18n.t('EditIcons.toggleLink')} />
          </button>
          <div aria-hidden="true" class={styles.separator} />
        </div>
        <div>
          <button type="button" data-command="alignLeft">
            <LeftIcon title={i18n.t('EditIcons.alignLeft')} />
          </button>
          <button type="button" data-command="alignCenter">
            <CenterIcon title={i18n.t('EditIcons.alignCenter')} />
          </button>
          <button type="button" data-command="alignRight">
            <RightIcon title={i18n.t('EditIcons.alignRight')} />
          </button>
          <div x-show="$store.editorState.isImage()">
            <div aria-hidden="true" class={styles.separator} />
            <button type="button" data-command="sizeAuto">
              <AutoIcon title={i18n.t('EditIcons.sizeAuto')} />
            </button>
            <button type="button" data-command="sizeMedium">
              <MediumIcon title={i18n.t('EditIcons.sizeMedium')} />
            </button>
            <button type="button" data-command="sizeSmall">
              <SmallIcon title={i18n.t('EditIcons.sizeSmall')} />
            </button>
          </div>
        </div>
      </div>

      {/* We need both global and local class. The global class is used to setup the menu for tiptap */}
      <div class={[styles.floatingMenu, 'floatingMenu']}>
        <button type="button" data-command="h2">
          <H2Icon title={i18n.t('EditIcons.toggleH2Level')} />
        </button>
        <button type="button" data-command="h3">
          <H3Icon title={i18n.t('EditIcons.toggleH3Level')} />
        </button>
        <button type="button" data-command="image">
          <ImageIcon title={i18n.t('EditIcons.insertImage')} />
        </button>
        <button type="button" data-command="hr">
          <HrIcon title={i18n.t('EditIcons.insertHr')} />
        </button>
        <button type="button" data-command="table">
          <TableIcon title={i18n.t('EditIcons.insertTable')} />
        </button>
      </div>

      <dialog
        id="uploadDialog"
        data-context="uploading file"
        x-ref="uploadDialog"
        class="card m-auto"
      >
        <form method="dialog" x-on:submit="App.validate">
          <h3 class="title is-2">{i18n.t('ImageDialog.title')}</h3>
          <div class="b-block">
            <div class="field">
              <label class="label" for="uploadUrl">
                {i18n.t('ImageDialog.enterUrl')}
              </label>
              <div class="control">
                <input
                  name="uploadUrl"
                  id="uploadUrl"
                  class="input"
                  type="text"
                />
              </div>
              <p class="help">{i18n.t('ImageDialog.enterUrlHelp')}</p>
            </div>
          </div>

          <hr />

          <div class="b-block">
            <div class="field">
              <label class="label" for="uploadFile">
                {i18n.t('ImageDialog.uploadFile')}
              </label>
              <div class="control">
                <input
                  name="uploadFile"
                  id="uploadFile"
                  class="input"
                  type="file"
                />
              </div>
              <p class="help">{i18n.t('ImageDialog.uploadFileHelp')}</p>
            </div>
          </div>
          <div class="level is-flex-direction-row">
            <menu class="level-item level-right">
              <button
                type="submit"
                class="button is-primary is-outlined"
                value="default"
                x-bind:disabled="$store.form.submitting"
                x-on:click="setTimeout(() => $store.form.submitting = true, 1)"
              >
                {i18n.t('ImageDialog.uploadAction')}
              </button>
              <button
                type="button"
                class="button is-danger is-outlined"
                value="cancel"
                x-bind:disabled="$store.form.submitting"
                x-on:click="$refs.uploadDialog.close()"
              >
                {i18n.t('common.cancel')}
              </button>
            </menu>
          </div>
        </form>
      </dialog>

      <script defer>App.enableEditor();</script>
    </>
  );
};
