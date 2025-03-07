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

interface EditorEnablerProps extends WithCtx {}

export const EditorEnabler = ({ ctx }: EditorEnablerProps) => {
  const { i18n } = ctx.app;

  return (
    <>
      {/* We need both global and local class. The global class is used to setup the menu for tiptap */}
      <div class={'bubbleMenu'}>
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
          <div aria-hidden="true" class="separator" />
          <button type="button" data-command="highlight">
            <HighlightIcon title={i18n.t('EditIcons.highlightSelection')} />
          </button>
          <div aria-hidden="true" class="separator" />
          <button type="button" data-command="code">
            <CodeIcon title={i18n.t('EditIcons.code')} />
          </button>
          <button type="button" data-command="codeblock">
            <CodeBlockIcon title={i18n.t('EditIcons.codeBlock')} />
          </button>
          <div aria-hidden="true" class="separator" />
          <button type="button" data-command="h2">
            <H2Icon title={i18n.t('EditIcons.toggleH2Level')} />
          </button>
          <button type="button" data-command="h3">
            <H3Icon title={i18n.t('EditIcons.toggleH3Level')} />
          </button>
          <button type="button" data-command="p">
            <ParagraphIcon title={i18n.t('EditIcons.paragraph')} />
          </button>
          <div aria-hidden="true" class="separator" />
          <button type="button" data-command="link">
            <LinkIcon title={i18n.t('EditIcons.toggleLink')} />
          </button>
          <div aria-hidden="true" class="separator" />
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
            <div aria-hidden="true" class="separator" />
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
      <div class={'floatingMenu'}>
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
        class="modal open"
      >
        <div class="modal-box prose">
          <h3 class="title is-2">{i18n.t('ImageDialog.title')}</h3>

          <form method="dialog" x-on:submit="App.validate">
            <fieldset class="fieldset mb-5 w-full">
              <legend class="fieldset-legend">
                {i18n.t('ImageDialog.enterUrl')}
              </legend>
              <input
                name="uploadUrl"
                id="uploadUrl"
                class="input w-full"
                type="text"
              />
              <div class="fieldset-label">
                {i18n.t('ImageDialog.enterUrlHelp')}
              </div>
            </fieldset>

            <div class="divider uppercase">{i18n.t('common.or')}</div>

            <fieldset class="fieldset mb-5 w-full">
              <legend class="fieldset-legend">
                {i18n.t('ImageDialog.uploadFile')}
              </legend>
              <input
                name="uploadFile"
                id="uploadFile"
                class="file-input w-full"
                type="file"
              />
              <div class="fieldset-label">
                {i18n.t('ImageDialog.uploadFileHelp')}
              </div>
            </fieldset>

            <menu class="flex justify-end gap-3">
              <button
                type="submit"
                class="btn btn-primary"
                value="default"
                x-bind:disabled="$store.form.submitting"
                x-on:click="setTimeout(() => $store.form.submitting = true, 1)"
              >
                {i18n.t('ImageDialog.uploadAction')}
              </button>
              <button
                type="button"
                class="btn"
                value="cancel"
                x-bind:disabled="$store.form.submitting"
                x-on:click="$refs.uploadDialog.close()"
              >
                {i18n.t('common.cancel')}
              </button>
            </menu>
          </form>
        </div>
      </dialog>

      <script defer>App.enableEditor();</script>
    </>
  );
};
