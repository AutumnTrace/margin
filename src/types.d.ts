declare module 'markdown-it-task-lists' {
  import type { PluginWithOptions } from 'markdown-it'
  const taskLists: PluginWithOptions<{ enabled?: boolean; label?: boolean; labelAfter?: boolean }>
  export default taskLists
}

// File System Access API: shipped in Chromium, not yet in lib.dom.
interface FilePickerType {
  description?: string
  accept: Record<string, string[]>
}
interface Window {
  showOpenFilePicker?: (options?: { types?: FilePickerType[]; multiple?: boolean }) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: { suggestedName?: string; types?: FilePickerType[] }) => Promise<FileSystemFileHandle>
}
interface FileSystemHandle {
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}
