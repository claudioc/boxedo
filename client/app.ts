import { store } from './lib/setupAlpine';
import './lib/setupHtmx';
import { enableEditor } from './lib/setupTipTap';

class App {
  private editor: ReturnType<typeof enableEditor> | null = null;

  validate(event: Event) {
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const error: Record<string, boolean> = {};

    if (form.name === 'editPage' || form.name === 'createPage') {
      for (const [key, value] of data.entries()) {
        error[key] = (value as string).trim() === '';
      }
    }

    if (form.name === 'movePage') {
      if (
        data.get('newParentId') === '' ||
        data.get('newParentId') === data.get('oldParentId')
      ) {
        error.newParentId = true;
      }
    }

    store.error = error;

    if (Object.values(error).some((v) => v)) {
      event.preventDefault();
      return;
    }

    window.onbeforeunload = null;
  }

  addImage(event: Event) {
    event.preventDefault();
    if (!this.editor) {
      return;
    }

    const imgUrl = 'https://source.unsplash.com/random/320x200';

    this.editor
      .chain()
      .focus()
      .setImage({
        src: imgUrl,
        alt: 'Random image from unsplash',
      })
      .run();
    // Not sure what's the difference.
    // editor.commands.insertContent(image);
  }

  enableEditor() {
    this.editor = enableEditor();
  }

  livereload() {
    new EventSource('http://localhost:8000/esbuild').addEventListener(
      'change',
      () => location.reload()
    );
    new EventSource('http://localhost:8001/esbuild').addEventListener(
      'change',
      () => setTimeout(() => location.reload(), 1000)
    );
  }
}
window.App = new App();
