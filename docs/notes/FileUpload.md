---
component: FileUpload
module: patterns/file-upload
covers: FileUploadDropzone, FileUploadTrigger, FileUploadList, FileUploadItem
use: A compound file uploader. `FileUpload` owns the file list, the type, size and count checks and a hidden input; `FileUploadDropzone` and `FileUploadTrigger` (files or a folder) add files, `FileUploadList` and `FileUploadItem` show them with progress, status and remove. It manages the list: you do the upload.
instead: Dropzone = just a drop area with no list or state; CopyButton = copy rather than upload; ChatAttachment = one attachment tile in a conversation; FileViewer = preview a file; Progress = just a bar
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | The dropzone, each trigger and each row's remove button are tab stops |
| Enter, Space | On the dropzone or a trigger: open the file (or folder) picker. On a remove button: remove the file |

Dragging has no keyboard form, so the dropzone and the triggers are the keyboard route. There are no arrow keys, so RTL changes nothing.

## Screen readers
- `FileUploadDropzone` is a `role="button"` named by its text ("Click to upload or drag and drop") and described by its hint (types, size and count limits); it has `aria-disabled` when disabled and `aria-busy` while a dropped folder is read. The real file input is a hidden sibling (`aria-hidden`, not focusable).
- Rejected files show in a `role="alert"` list, one message per file (the first problem only, such as "n.txt isn't a supported file type."), until the next add.
- The list is a `ul` named "Files". Each row shows the name (the folder path for folder files) and size, a "Complete" or error text with an icon labelled "Uploaded" or "Failed", and a `progressbar` named "Uploading <name>" (indeterminate when `progress` is undefined). The remove button is "Remove <name>".
- Where the browser cannot pick folders, `FileUploadTrigger directory` is `aria-disabled` and described by "This browser can't choose folders. Choose files instead."

## Reduced motion
Drag feedback (border, tint, icon lift) and the progress fill use transitions that the global net ends in 1 ms. The tick pops with `animate-pop` when a file finishes, which the net stops.

## Server rendering
Without `directory` the markup is the same on both sides. The folder trigger and folder dropzone ask the browser for `webkitdirectory` support with `useSyncExternalStore`: the server and hydration render the "unsupported" state, and the real answer appears after hydration.

## Gotchas
- Nothing is uploaded for you. `onFilesAdded` gives the new `UploadFile`s (`status: "idle"`): start your request there and feed `progress` and `status` back through controlled `files` (or `onFilesChange`). `status` also takes `pending`, `running`, `succeeded`, `failed` and `canceled`.
- `accept`, `maxSize` (bytes) and `maxFiles` (in total, counting files already listed) are checked on every add; rejections go to `onFilesRejected` and the alert. `multiple={false}` makes each new file replace the previous one.
- With `name` the hidden input carries the whole file list (picked, dropped and `defaultFiles`; removing a file removes it) through `DataTransfer`, so a native form post sends the files. Without `name`, or in a browser that cannot set `input.files`, the input is emptied after each pick: read the files from the list or `onFilesAdded`. Picking a file that is already on the input again may fire no change event.
- `FileUploadList` renders nothing for an empty list; `FileUploadItem` outside a `FileUpload` needs its own `onRemove`. Read the state anywhere inside with the `useFileUpload` hook.

## Example
```tsx
import { FileUpload, FileUploadDropzone, FileUploadList, FileUploadTrigger, type UploadFile } from "@cleanprompt/sutra-ui";

export function Example({ upload }: { upload: (files: UploadFile[]) => void }) {
  return (
    <FileUpload accept="image/*,.pdf" maxSize={5 * 1024 * 1024} maxFiles={4} onFilesAdded={upload}>
      <FileUploadDropzone />
      <div>
        <FileUploadTrigger>Choose files</FileUploadTrigger>
      </div>
      <FileUploadList />
    </FileUpload>
  );
}
```
